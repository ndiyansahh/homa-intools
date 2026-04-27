import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutDB, mitraDB, visitDB, mitraRateConfigDB, customerDB, payoutAdjustmentDB, subscriptionPackageDB, invoiceDB } from '@/lib/schema';
import { eq, and, or, desc, gte, lte, like, ilike, count, isNull } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';
import { getNormalRange } from '@/lib/utils/normalRange';
import { extractVisitsPerWeek } from '@/lib/utils/subscriptionUtils';

/**
 * Calculate the billing cycle (invoice period) that contains a given date
 * Billing cycles are monthly periods starting from the subscription start date
 *
 * Example: If subscription starts on 18-Mar-2026:
 * - Cycle 1: 18-Mar to 17-Apr (exactly 1 month)
 * - Cycle 2: 18-Apr to 17-May (exactly 1 month)
 * - etc.
 *
 * Edge cases:
 * - Start: 31-Jan → End: 28-Feb (or 29-Feb in leap year) - last day of Feb
 * - Start: 31-May → End: 30-Jun - last day of June
 *
 * @param subscriptionStart - Customer's subscription start date (YYYY-MM-DD)
 * @param targetDate - Date to find the billing cycle for
 * @returns { start: Date, end: Date } - The billing cycle period
 */
// Parse a YYYY-MM-DD string as local midnight (avoid UTC offset shifting the date)
function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

// Format a Date to YYYY-MM-DD using local time
function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getBillingCycle(subscriptionStart: string, targetDate: Date): { start: Date; end: Date } {
  const subStart = parseLocalDate(subscriptionStart);
  const target = new Date(targetDate);

  // Find which billing cycle the target date falls into
  let cycleStart = new Date(subStart);

  // Advance cycle start to the correct year/month
  while (true) {
    // Calculate next cycle start by adding 1 month
    const year = cycleStart.getFullYear();
    const month = cycleStart.getMonth();
    const day = cycleStart.getDate();

    // Create next cycle start date
    let nextMonth = month + 1;
    let nextYear = year;

    if (nextMonth > 11) {
      nextMonth = 0;
      nextYear++;
    }

    // Handle day overflow (e.g., Jan 31 → Feb 28/29)
    const nextCycleStart = new Date(nextYear, nextMonth, 1);
    const daysInNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
    const nextDay = Math.min(day, daysInNextMonth);
    nextCycleStart.setDate(nextDay);

    // End of current cycle = day before next cycle starts
    const cycleEnd = new Date(nextCycleStart.getTime() - 86400000);

    if (target >= cycleStart && target <= cycleEnd) {
      return { start: cycleStart, end: cycleEnd };
    }

    // Move to next cycle
    cycleStart = new Date(nextCycleStart);

    // Safety check to prevent infinite loop
    if (cycleStart > target) {
      // Target is before subscription start, use first cycle
      const firstMonth = subStart.getMonth();
      const firstYear = subStart.getFullYear();
      const firstDay = subStart.getDate();

      let nextFirstMonth = firstMonth + 1;
      let nextFirstYear = firstYear;

      if (nextFirstMonth > 11) {
        nextFirstMonth = 0;
        nextFirstYear++;
      }

      const firstNextCycleStart = new Date(nextFirstYear, nextFirstMonth, 1);
      const daysInFirstNextMonth = new Date(nextFirstYear, nextFirstMonth + 1, 0).getDate();
      const firstNextDay = Math.min(firstDay, daysInFirstNextMonth);
      firstNextCycleStart.setDate(firstNextDay);

      const firstCycleEnd = new Date(firstNextCycleStart.getTime() - 86400000);

      return {
        start: new Date(subStart),
        end: firstCycleEnd
      };
    }
  }
}

// GET - Fetch all payout records with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const mitraName = searchParams.get('mitraName') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    console.log('📊 Fetching payouts with filters:', {
      year,
      month,
      mitraName,
      page,
      limit
    });

    // Build where conditions
    const conditions = [];

    if (year) {
      conditions.push(eq(payoutDB.year, parseInt(year)));
    }

    if (month) {
      conditions.push(eq(payoutDB.month, parseInt(month)));
    }

    if (mitraName) {
      conditions.push(ilike(mitraDB.mitraName, `%${mitraName}%`));
    }

    // Fetch payouts with mitra data
    const payouts = await db
      .select({
        id: payoutDB.id,
        payoutId: payoutDB.payoutId,
        mitraId: payoutDB.mitraId,
        mitraName: mitraDB.mitraName,
        year: payoutDB.year,
        month: payoutDB.month,
        payoutDate: payoutDB.payoutDate,
        monthlyRate: payoutDB.monthlyRate, // NEW
        scheduledVisits: payoutDB.scheduledVisits, // NEW
        totalVisits: payoutDB.totalVisits,
        pricePerVisit: payoutDB.pricePerVisit, // DEPRECATED
        basePayout: payoutDB.basePayout,
        bonusAmount: payoutDB.bonusAmount,
        totalPayout: payoutDB.totalPayout,
        status: payoutDB.status,
        bonusEligible: payoutDB.bonusEligible,
        mitraBonusCommission: mitraDB.mitraBonusCommission,
        notes: payoutDB.notes,
        paidAt: payoutDB.paidAt,
        createdAt: payoutDB.createdAt,
        updatedAt: payoutDB.updatedAt,
      })
      .from(payoutDB)
      .leftJoin(mitraDB, eq(payoutDB.mitraId, mitraDB.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payoutDB.payoutDate), desc(payoutDB.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`✅ Found ${payouts.length} payout records`);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(payoutDB)
      .leftJoin(mitraDB, eq(payoutDB.mitraId, mitraDB.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(totalResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    // Override bonusEligible with current mitra status (not stale payout record value)
    const payoutsWithCurrentEligibility = payouts.map(p => ({
      ...p,
      bonusEligible: p.mitraBonusCommission !== 'Not Eligible',
    }));

    const response = {
      success: true,
      items: payoutsWithCurrentEligibility,
      data: payoutsWithCurrentEligibility,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate monthly payout records
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can generate payouts
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    console.log(`🔄 Generating payouts for ${year}-${String(month).padStart(2, '0')}`);

    // Check if payouts for this period already exist
    const existingPayouts = await db
      .select()
      .from(payoutDB)
      .where(
        and(
          eq(payoutDB.year, year),
          eq(payoutDB.month, month)
        )
      )
      .limit(1);

    // Feature flag: Allow payout regeneration for testing
    const allowRegeneration = process.env.ALLOW_PAYOUT_REGENERATION === 'true';

    // Map mitraId -> existing notes so we can restore after regeneration
    const existingNotesMap = new Map<string, string | null>();

    if (existingPayouts.length > 0) {
      if (allowRegeneration) {
        // Preserve notes/tunjangan before deleting
        const allExisting = await db
          .select({ mitraId: payoutDB.mitraId, notes: payoutDB.notes })
          .from(payoutDB)
          .where(and(eq(payoutDB.year, year), eq(payoutDB.month, month)));
        allExisting.forEach(p => existingNotesMap.set(p.mitraId, p.notes));

        console.log(`🔄 ALLOW_PAYOUT_REGENERATION=true: Deleting existing payouts for ${year}-${String(month).padStart(2, '0')}`);
        await db
          .delete(payoutDB)
          .where(
            and(
              eq(payoutDB.year, year),
              eq(payoutDB.month, month)
            )
          );
        console.log(`✅ Existing payouts deleted. Proceeding with regeneration...`);
      } else {
        return NextResponse.json({
          success: false,
          message: `Payouts for ${year}-${String(month).padStart(2, '0')} have already been generated. Set ALLOW_PAYOUT_REGENERATION=true in .env to allow regeneration.`
        }, { status: 400 });
      }
    }

    // Get all active mitras
    const mitras = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        baseRate: mitraDB.baseRate,
        monthlyBaseRate: mitraDB.monthlyBaseRate,
        trialRatePerVisit: mitraDB.trialRatePerVisit,
        mitraBonusCommission: mitraDB.mitraBonusCommission,
      })
      .from(mitraDB)
      .where(eq(mitraDB.isActive, true));

    const payoutRecords = [];
    const payoutAdjustmentsMap = new Map<string, any[]>(); // Store adjustments by mitraId
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of month
    const lastDayOfMonth = toLocalDateString(monthEnd);

    console.log(`📅 Period: ${toLocalDateString(monthStart)} to ${lastDayOfMonth}`);

    for (const mitra of mitras) {
      console.log(`\n🔄 Processing payout for ${mitra.mitraName}...`);

      // Step 1: Get all SCHEDULED visits for this mitra in the payout month
      // IMPORTANT: Filter by scheduledDate, not completedAt!
      // This ensures we pay based on when visits were scheduled, not when completed
      const visitsInMonth = await db
        .select({
          visitId: visitDB.id,
          customerId: visitDB.customerId,
          invoiceId: visitDB.invoiceId,
          customerName: customerDB.customerName,
          subscriptionPackageId: customerDB.subscriptionPackageId,
          subscriptionPackage: customerDB.subscriptionPackage,
          subscriptionStatus: customerDB.subscriptionStatus,
          scheduledDate: visitDB.scheduledDate,
          completedAt: visitDB.completedAt,
          status: visitDB.status,
          packageVisitsPerWeek: subscriptionPackageDB.visitsPerWeek,
        })
        .from(visitDB)
        .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
        .leftJoin(subscriptionPackageDB, eq(customerDB.subscriptionPackageId, subscriptionPackageDB.id))
        .where(
          and(
            or(
              eq(visitDB.actualMitraId, mitra.id),
              and(isNull(visitDB.actualMitraId), eq(visitDB.mitraId, mitra.id))
            ),
            eq(visitDB.status, 'Done'),
            gte(visitDB.scheduledDate, toLocalDateString(monthStart)),
            lte(visitDB.scheduledDate, toLocalDateString(monthEnd))
          )
        );

      if (visitsInMonth.length === 0) {
        console.log(`⏭️  Skipping ${mitra.mitraName} - no completed visits`);
        continue;
      }

      // Step 2: Separate trial visits from regular visits
      const trialStatuses = ['Trial', 'Trial Scheduled', 'Not Converted', 'Cancelled'];
      const trialVisitsInMonth = visitsInMonth.filter(v => trialStatuses.includes(v.subscriptionStatus || ''));
      const regularVisitsInMonth = visitsInMonth.filter(v => !trialStatuses.includes(v.subscriptionStatus || ''));

      // Step 2a: Handle trial visits — flat rate per visit
      let totalBasePayout = 0;
      let totalScheduledVisits = 0;
      let totalCompletedVisits = 0;
      const customerBreakdown: any[] = [];

      if (trialVisitsInMonth.length > 0) {
        const trialRatePerVisit = mitra.trialRatePerVisit ? Number(mitra.trialRatePerVisit) : 0;

        if (trialRatePerVisit > 0) {
          const trialPayout = trialVisitsInMonth.length * trialRatePerVisit;
          totalBasePayout += trialPayout;
          totalCompletedVisits += trialVisitsInMonth.length;

          // Group by customer for breakdown
          const trialByCustomer = new Map<string, typeof trialVisitsInMonth>();
          trialVisitsInMonth.forEach(v => {
            if (!trialByCustomer.has(v.customerId)) trialByCustomer.set(v.customerId, []);
            trialByCustomer.get(v.customerId)!.push(v);
          });

          for (const [, tVisits] of trialByCustomer.entries()) {
            const payout = tVisits.length * trialRatePerVisit;
            const visitDates = tVisits
              .map(v => v.scheduledDate)
              .filter(Boolean)
              .sort();
            customerBreakdown.push({
              customerId: tVisits[0].customerId,
              customerName: tVisits[0].customerName || 'Unknown',
              subscriptionPackage: 'Trial',
              scheduledVisits: tVisits.length,
              completedVisits: tVisits.length,
              monthlyRate: trialRatePerVisit,
              payout,
              isTrialVisit: true,
              visitDates,
            });
            console.log(`   🧪 Trial visit: ${tVisits[0].customerName} — ${tVisits.length} visit(s) × Rp ${trialRatePerVisit.toLocaleString()} = Rp ${payout.toLocaleString()}`);
          }
        } else {
          console.log(`   ⚠️  No trial rate configured for ${mitra.mitraName}, skipping ${trialVisitsInMonth.length} trial visit(s)`);
        }
      }

      // Step 2b: Group regular visits by customer
      const customerVisitMap = new Map<string, typeof regularVisitsInMonth>();
      regularVisitsInMonth.forEach((visit) => {
        const customerId = visit.customerId;
        if (!customerVisitMap.has(customerId)) {
          customerVisitMap.set(customerId, []);
        }
        customerVisitMap.get(customerId)!.push(visit);
      });

      console.log(`   📋 Processing ${customerVisitMap.size} regular customers + ${trialVisitsInMonth.length} trial visit(s)`);

      // Step 3: Calculate payout per customer — one entry per billing-cycle per customer
      // A customer may have visits in TWO billing cycles within a single calendar month
      // (e.g., last day(s) of old period + first day(s) of new period).
      // We group visits by (customerId, billingCycleKey) and process each group independently.

      for (const [customerId, visits] of customerVisitMap.entries()) {
        const firstVisit = visits[0];
        const customerName = firstVisit.customerName || 'Unknown';
        const subscriptionPackage = firstVisit.subscriptionPackage || 'Unknown';
        // Use visitsPerWeek from package table (authoritative), fallback to parsing package name
        const packageVisitsPerWeek = firstVisit.packageVisitsPerWeek ?? extractVisitsPerWeek(subscriptionPackage);
        // Accumulates per-billing-cycle entries; merged into one row after the loop (TC-028A)
        const cycleBreakdownEntries: any[] = [];

        // Step 3a: Get all invoices for this customer to find the correct billing anchor per visit
        // We must NOT use customerDB.subscriptionStart because it always reflects the LATEST renewal period.
        // After renewal, old visits would get a wrong billing cycle anchor.
        const customerInvoices = await db
          .select({
            id: invoiceDB.id,
            invoiceStartDate: invoiceDB.invoiceStartDate,
            invoiceEndDate: invoiceDB.invoiceEndDate,
            scheduledVisitsCount: invoiceDB.scheduledVisitsCount,
          })
          .from(invoiceDB)
          .where(eq(invoiceDB.customerId, customerId));

        if (!customerInvoices.length) {
          console.log(`   ⚠️  No invoices found for ${customerName}, skipping`);
          continue;
        }

        // Build invoice lookup map by id for quick access
        const invoiceById = new Map(customerInvoices.map(inv => [inv.id, inv]));

        // Step 3b: Group visits by billing cycle
        // For each visit, find the invoice whose period contains the visit's scheduledDate.
        // TC-028B edge case: if visit is beyond invoice end date (rescheduled), use visit.invoiceId
        // to find the original invoice — visit is paid in the month it occurs, using original denominator.
        const visitsByBillingCycle = new Map<string, { visits: typeof visits; billingCycle: { start: Date; end: Date }; invoiceId: string }>();
        for (const visit of visits) {
          const visitDate = visit.scheduledDate;

          // First: try to match by invoice period (normal case)
          let matchingInvoice = customerInvoices.find(inv =>
            inv.invoiceStartDate && inv.invoiceEndDate &&
            visitDate >= inv.invoiceStartDate && visitDate <= inv.invoiceEndDate
          );

          // TC-028A/B: visit beyond end date — use original invoice via visit.invoiceId.
          // Mark as beyondEndDate so we skip getBillingCycle and use invoice dates directly.
          let beyondEndDate = false;
          if (!matchingInvoice && visit.invoiceId) {
            const originalInvoice = invoiceById.get(visit.invoiceId);
            if (originalInvoice) {
              matchingInvoice = originalInvoice;
              beyondEndDate = true;
              console.log(`   📌 ${customerName} visit on ${visitDate} is beyond invoice end date — using original invoice ${originalInvoice.invoiceStartDate}→${originalInvoice.invoiceEndDate}`);
            }
          }

          if (!matchingInvoice) {
            console.log(`   ⚠️  No matching invoice for ${customerName} visit on ${visitDate}, skipping`);
            continue;
          }

          // For beyond-end-date visits, use invoice period directly as the billing cycle.
          // Calling getBillingCycle with the rescheduled date would compute a new future cycle
          // (e.g. 22 May–21 Jun instead of 22 Apr–21 May), causing a wrong denominator.
          let cycle: { start: Date; end: Date };
          if (beyondEndDate) {
            cycle = {
              start: parseLocalDate(matchingInvoice.invoiceStartDate!),
              end: parseLocalDate(matchingInvoice.invoiceEndDate!),
            };
          } else {
            cycle = getBillingCycle(matchingInvoice.invoiceStartDate!, parseLocalDate(visit.scheduledDate));
          }

          // Use invoiceId as part of cycle key to handle beyond-end-date visits correctly
          const cycleKey = `${matchingInvoice.id}::${toLocalDateString(cycle.start)}`;
          if (!visitsByBillingCycle.has(cycleKey)) {
            visitsByBillingCycle.set(cycleKey, { visits: [], billingCycle: cycle, invoiceId: matchingInvoice.id });
          }
          visitsByBillingCycle.get(cycleKey)!.visits.push(visit);
        }

        console.log(`   📋 ${customerName}: ${visitsByBillingCycle.size} billing cycle(s) in this month`);

        // Step 3c: Process each billing cycle separately
        for (const [, { visits: cycleVisits, billingCycle, invoiceId: cycleInvoiceId }] of visitsByBillingCycle.entries()) {
          // Intersection of billing cycle with the payout calendar month (for overlap check only)
          const intersectionStart = new Date(Math.max(billingCycle.start.getTime(), monthStart.getTime()));
          const intersectionEnd = new Date(Math.min(billingCycle.end.getTime(), monthEnd.getTime()));

          // Skip if billing cycle doesn't overlap with payout month AND there are no visits
          // in the payout month either. Beyond-end-date rescheduled visits (TC-028B) have
          // scheduledDate inside the payout month but a billing cycle that ends before it —
          // they must not be skipped; the cycle group exists only because of those visits.
          const hasVisitsInPayoutMonth = cycleVisits.some(v =>
            v.scheduledDate >= toLocalDateString(monthStart) && v.scheduledDate <= toLocalDateString(monthEnd)
          );
          if (intersectionEnd < intersectionStart && !hasVisitsInPayoutMonth) {
            console.log(`   ⏭️  ${customerName}: billing cycle ${toLocalDateString(billingCycle.start)}→${toLocalDateString(billingCycle.end)} has no overlap with payout month, skipping`);
            continue;
          }

          // For breakdown display, use actual min/max scheduledDate of visits in this group.
          // Beyond-end-date visits have scheduledDate outside billingCycle.end so intersection
          // would give wrong bounds — always use actual visit dates.
          const visitDatesInMonth = cycleVisits
            .map(v => v.scheduledDate)
            .filter(Boolean)
            .sort();
          const displayStart = visitDatesInMonth[0] ?? toLocalDateString(intersectionStart);
          const displayEnd = visitDatesInMonth[visitDatesInMonth.length - 1] ?? toLocalDateString(intersectionEnd);

          console.log(`   📅 ${customerName}: Billing ${toLocalDateString(billingCycle.start)} to ${toLocalDateString(billingCycle.end)}`);
          console.log(`   📅   Display range: ${displayStart} to ${displayEnd}`);

          // Step 3d: Get rate for this mitra + visitsPerWeek
          // New schema: look up by (mitraId, visitsPerWeek)
          const visitsPerWeekForRate = packageVisitsPerWeek;

          const rateConfigs = visitsPerWeekForRate > 0
            ? await db
                .select({ payoutRate: mitraRateConfigDB.payoutRate })
                .from(mitraRateConfigDB)
                .where(
                  and(
                    eq(mitraRateConfigDB.mitraId, mitra.id),
                    eq(mitraRateConfigDB.visitsPerWeek, visitsPerWeekForRate)
                  )
                )
                .limit(1)
            : [];

          let monthlyRate = 0;
          if (rateConfigs.length > 0) {
            monthlyRate = Number(rateConfigs[0].payoutRate);
          } else {
            // Fallback 1: use any rate config for this mitra (ignore visitsPerWeek)
            const anyRateConfig = await db
              .select({ payoutRate: mitraRateConfigDB.payoutRate })
              .from(mitraRateConfigDB)
              .where(eq(mitraRateConfigDB.mitraId, mitra.id))
              .limit(1);

            if (anyRateConfig.length > 0) {
              monthlyRate = Number(anyRateConfig[0].payoutRate);
              console.log(`   ℹ️  No rate for ${visitsPerWeekForRate}x/week, using default rate config: Rp${monthlyRate.toLocaleString()}`);
            } else {
              // Fallback 2: use mitra's monthlyBaseRate only (baseRate is deprecated and unreliable)
              monthlyRate = Number(mitra.monthlyBaseRate) || 0;
              console.log(`   ⚠️  No rate config found for ${mitra.mitraName}, using monthlyBaseRate: Rp${monthlyRate.toLocaleString()}`);
            }
          }

          if (monthlyRate === 0) {
            console.log(`   ⚠️  No rate for ${customerName} (${subscriptionPackage}), skipping`);
            continue;
          }

          // Step 3e: Total scheduled visits in the FULL billing cycle (denominator)
          // TC-028B: use invoice.scheduledVisitsCount if available — this is the fixed denominator
          // set when invoice was created, unaffected by reschedule beyond end date.
          // Fallback: query visits in cycle range (existing logic for old data without scheduledVisitsCount)
          const cycleInvoice = cycleInvoiceId ? invoiceById.get(cycleInvoiceId) : undefined;
          let totalScheduledInCycle: number;

          if (cycleInvoice && cycleInvoice.scheduledVisitsCount && cycleInvoice.scheduledVisitsCount > 0) {
            totalScheduledInCycle = cycleInvoice.scheduledVisitsCount;
            console.log(`   📊 Using invoice scheduledVisitsCount=${totalScheduledInCycle} as denominator`);
          } else {
            // Fallback: query visits in billing cycle range (existing logic)
            const scheduledInCycleRows = await db
              .select({ id: visitDB.id })
              .from(visitDB)
              .where(
                and(
                  eq(visitDB.customerId, customerId),
                  gte(visitDB.scheduledDate, toLocalDateString(billingCycle.start)),
                  lte(visitDB.scheduledDate, toLocalDateString(billingCycle.end))
                )
              );
            totalScheduledInCycle = scheduledInCycleRows.length;
          }

          const completedInMonth = cycleVisits.length;

          // Step 3f: Extract visitsPerWeek (use authoritative value from package table)
          let visitsPerWeek = packageVisitsPerWeek;
          if (!visitsPerWeek || visitsPerWeek < 1 || visitsPerWeek > 7) {
            // Trial package has visitsPerWeek = 0 — skip from regular payout
            console.log(`   ⚠️  Skipping ${customerName} — Trial package has no regular payout frequency`);
            continue;
          }

          // Step 3g: Calculate payout per TOPIC #2
          // Formula: payout = (completedInMonth / totalScheduledInCycle) × monthlyRate
          // Bonus: if totalScheduledInCycle > normalMax, extra visits get bonus
          let customerPayout = 0;
          let payoutCalculationDetails: any = {};

          if (totalScheduledInCycle === 0) {
            console.log(`   ⚠️  No scheduled visits in cycle for ${customerName}, skipping`);
            continue;
          }

          // Get normal range for this frequency (Topic #1)
          // For 7x/week: normalMax is dynamic = actual days in payout month
          let normalMin = totalScheduledInCycle;
          let normalMax = totalScheduledInCycle;
          try {
            const nr = getNormalRange(visitsPerWeek);
            normalMin = nr.min;
            // 7x/week: dynamic normalMax = actual days in payout month
            normalMax = visitsPerWeek === 7 ? monthEnd.getDate() : nr.max;
            // 7x/week: normalMin also dynamic = normalMax (every day package, no range tolerance)
            if (visitsPerWeek === 7) normalMin = normalMax;
          } catch {}

          // Extra visits in cycle = scheduled beyond normal max
          const extraVisitsInCycle = Math.max(0, totalScheduledInCycle - normalMax);

          // Payout calculation (3 cases):
          // Case 1: within normal range → 100% rate
          // Case 2: below normal min → pro-rata: completedInMonth / denominator × rate
          //         denominator = totalScheduledInCycle if < normalMax (e.g. mitra swap, short month)
          //         denominator = normalMax if totalScheduledInCycle >= normalMax
          // Case 3: above normal max → 100% + (extraVisits / normalMax × 100%) × rate
          let basePayout = 0;
          let percentage = 0;

          // Denominator for pro-rata: use actual scheduled when fewer than normalMax were scheduled
          // This correctly handles mitra-swap (e.g. 2/4 scheduled = 50%, not 2/5 = 40%)
          const proRataDenominator = Math.min(totalScheduledInCycle, normalMax);

          if (completedInMonth >= normalMin && completedInMonth <= normalMax) {
            // Case 1: normal range → full rate
            basePayout = monthlyRate;
            percentage = 100;
          } else if (completedInMonth < normalMin) {
            // Case 2: under-perform → pro-rata against actual scheduled (capped at normalMax)
            basePayout = (completedInMonth / proRataDenominator) * monthlyRate;
            percentage = Math.round((completedInMonth / proRataDenominator) * 100 * 100) / 100;
          } else {
            // Case 3: bonus visits → 100% + bonus
            const bonusPct = (extraVisitsInCycle / normalMax) * 100;
            basePayout = monthlyRate * (1 + bonusPct / 100);
            percentage = Math.round((1 + bonusPct / 100) * 100 * 100) / 100;
          }

          customerPayout = Math.round(basePayout);

          payoutCalculationDetails = {
            method: 'TOPIC1_TOPIC2_FORMULA',
            visitsPerWeek,
            normalMin,
            normalMax,
            proRataDenominator,
            totalScheduledInCycle,
            extraVisitsInCycle,
            completedInMonth,
            percentage,
            monthlyRate,
            basePayout: Math.round(basePayout),
            totalPayout: customerPayout,
          };

          console.log(`   ✓ ${customerName}: ${completedInMonth} visits (normal ${normalMin}-${normalMax}) = ${percentage}% → Rp${customerPayout.toLocaleString()}`);

          totalBasePayout += customerPayout;
          totalScheduledVisits += totalScheduledInCycle;
          totalCompletedVisits += completedInMonth;

          cycleBreakdownEntries.push({
            customerId,
            customerName,
            subscriptionPackage,
            billingCycleStart: displayStart,
            billingCycleEnd: displayEnd,
            scheduledVisits: totalScheduledInCycle,
            completedVisits: completedInMonth,
            monthlyRate,
            payout: customerPayout,
            calculationDetails: payoutCalculationDetails,
          });
        } // End billing cycle loop

        // TC-028A: merge multiple billing-cycle entries for the same customer into one row.
        // This happens when a beyond-end-date rescheduled visit falls into a new billing period
        // after renewal, creating a second row. We combine completed visits, sum payout, and
        // extend the date range — denominator stays from the entry with the most scheduled visits.
        if (cycleBreakdownEntries.length > 1) {
          const merged = cycleBreakdownEntries.reduce((acc, entry) => {
            const combinedCompleted = acc.completedVisits + entry.completedVisits;
            const combinedPayout = acc.payout + entry.payout;
            const mergedStart = acc.billingCycleStart < entry.billingCycleStart ? acc.billingCycleStart : entry.billingCycleStart;
            const mergedEnd = acc.billingCycleEnd > entry.billingCycleEnd ? acc.billingCycleEnd : entry.billingCycleEnd;
            // Use the larger scheduledVisits as the denominator (original billing cycle)
            const dominantEntry = acc.scheduledVisits >= entry.scheduledVisits ? acc : entry;
            return {
              ...dominantEntry,
              billingCycleStart: mergedStart,
              billingCycleEnd: mergedEnd,
              completedVisits: combinedCompleted,
              payout: combinedPayout,
              calculationDetails: {
                ...dominantEntry.calculationDetails,
                completedInMonth: combinedCompleted,
              },
            };
          });
          console.log(`   🔀 ${customerName}: merged ${cycleBreakdownEntries.length} billing cycle rows → ${merged.completedVisits}/${merged.scheduledVisits} visits (${merged.billingCycleStart} to ${merged.billingCycleEnd})`);
          customerBreakdown.push(merged);
        } else if (cycleBreakdownEntries.length === 1) {
          customerBreakdown.push(cycleBreakdownEntries[0]);
        }
      } // End customer loop

      if (totalBasePayout === 0) {
        console.log(`⏭️  Skipping ${mitra.mitraName} - total payout is 0`);
        continue;
      }


      const bonusEligible = mitra.mitraBonusCommission !== 'Not Eligible';
      let bonusAmount = 0;

      // Feature 8b: Check for pending adjustments for this mitra
      const pendingAdjustments = await db
        .select()
        .from(payoutAdjustmentDB)
        .where(
          and(
            eq(payoutAdjustmentDB.mitraId, mitra.id),
            eq(payoutAdjustmentDB.status, 'PENDING')
          )
        );

      let totalAdjustmentAmount = 0;
      const adjustmentBreakdown: any[] = [];

      if (pendingAdjustments.length > 0) {
        console.log(`\n📊 Found ${pendingAdjustments.length} pending adjustment(s) for ${mitra.mitraName}`);

        for (const adj of pendingAdjustments) {
          totalAdjustmentAmount += Number(adj.adjustmentAmount);
          adjustmentBreakdown.push({
            adjustmentId: adj.adjustmentId,
            type: adj.adjustmentType,
            amount: Number(adj.adjustmentAmount),
            reason: adj.reason,
            originalYear: adj.originalYear,
            originalMonth: adj.originalMonth,
          });

          console.log(`   ${adj.adjustmentType}: ${Number(adj.adjustmentAmount) > 0 ? '+' : ''}Rp${Number(adj.adjustmentAmount).toLocaleString()} - ${adj.reason}`);
        }
      }

      // Generate payout ID: PAY/MitraName/YYYY.MM.DD-XXXXX
      const mitraNameClean = mitra.mitraName.replace(/\s+/g, '');
      const sequence: string = String(payoutRecords.length + 1).padStart(5, '0');
      const payoutId = `PAY/${mitraNameClean}/${year}.${String(month).padStart(2, '0')}.${String(monthEnd.getDate()).padStart(2, '0')}-${sequence}`;

      // Calculate final payout with adjustments
      const finalBasePayout = totalBasePayout + totalAdjustmentAmount;
      const finalTotalPayout = finalBasePayout + bonusAmount;

      // Restore notes (tunjangan) from previous record if regenerating
      const preservedNotes = existingNotesMap.get(mitra.id) ?? null;

      // If notes exist, recalculate totalPayout to include tunjangan
      let finalTotalWithTunjangan = finalTotalPayout;
      let preservedTunjanganTotal = 0;
      if (preservedNotes) {
        try {
          const parsed = JSON.parse(preservedNotes);
          const uangParkir = Number(parsed.uangParkir) || 0;
          const kompensasiPromosi = Number(parsed.kompensasiPromosi) || 0;
          const lainnyaTotal = Array.isArray(parsed.lainnyaItems)
            ? parsed.lainnyaItems.reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0)
            : (Number(parsed.lainnyaAmount) || 0);
          preservedTunjanganTotal = uangParkir + kompensasiPromosi + lainnyaTotal;
          finalTotalWithTunjangan = finalTotalPayout + preservedTunjanganTotal;
        } catch {}
      }

      const payoutRecord = {
        payoutId,
        mitraId: mitra.id,
        year,
        month,
        payoutDate: lastDayOfMonth,
        monthlyRate: '0',
        scheduledVisits: totalScheduledVisits,
        totalVisits: totalCompletedVisits,
        pricePerVisit: '0',
        basePayout: finalBasePayout.toString(),
        bonusAmount: preservedTunjanganTotal.toString(),
        totalPayout: finalTotalWithTunjangan.toString(),
        status: 'Pending',
        bonusEligible,
        notes: preservedNotes,
        breakdown: JSON.stringify({
          customers: customerBreakdown,
          adjustments: adjustmentBreakdown.length > 0 ? adjustmentBreakdown : undefined,
        }),
      };

      payoutRecords.push(payoutRecord);

      // Store adjustments to mark as APPLIED later
      if (pendingAdjustments.length > 0) {
        payoutAdjustmentsMap.set(mitra.id, pendingAdjustments);
      }

      console.log(`\n✅ Generated payout for ${mitra.mitraName}:`);
      console.log(`   Base: Rp${totalBasePayout.toLocaleString()}`);
      if (totalAdjustmentAmount !== 0) {
        console.log(`   Adjustments: ${totalAdjustmentAmount > 0 ? '+' : ''}Rp${totalAdjustmentAmount.toLocaleString()}`);
        console.log(`   Final: Rp${finalBasePayout.toLocaleString()}`);
      }
      console.log(`   (${totalCompletedVisits}/${totalScheduledVisits} visits across ${customerBreakdown.length} customers)`);
    }

    if (payoutRecords.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No payouts to generate for this period'
      }, { status: 400 });
    }

    // Insert payout records
    const insertedPayouts = await db.insert(payoutDB).values(payoutRecords).returning();

    // Feature 8b: Mark adjustments as APPLIED and link to created payout
    for (const insertedPayout of insertedPayouts) {
      const pendingAdjs = payoutAdjustmentsMap.get(insertedPayout.mitraId);

      if (pendingAdjs && pendingAdjs.length > 0) {
        await db
          .update(payoutAdjustmentDB)
          .set({
            status: 'APPLIED',
            appliedPayoutId: insertedPayout.id,
            appliedYear: year,
            appliedMonth: month,
            appliedAt: new Date(),
          })
          .where(
            and(
              eq(payoutAdjustmentDB.mitraId, insertedPayout.mitraId),
              eq(payoutAdjustmentDB.status, 'PENDING')
            )
          );

        console.log(`📊 Marked ${pendingAdjs.length} adjustment(s) as APPLIED for payout ${insertedPayout.payoutId}`);
      }
    }

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'PAYOUT_GENERATED',
        userId: session.userId,
        email: session.email,
        details: {
          year,
          month,
          totalPayouts: payoutRecords.length,
        }
      });
    }

    console.log(`🎉 Generated ${payoutRecords.length} payout records`);

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${payoutRecords.length} payout records`,
      data: {
        year,
        month,
        totalPayouts: payoutRecords.length,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Generate payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
