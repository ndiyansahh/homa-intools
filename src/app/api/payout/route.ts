import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutDB, mitraDB, visitDB, mitraRateConfigDB, customerDB, payoutAdjustmentDB } from '@/lib/schema';
import { eq, and, desc, gte, lte, like, ilike, count, isNull } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';

/**
 * Calculate the billing cycle (invoice period) that contains a given date
 * Billing cycles are monthly periods starting from the subscription start date
 *
 * Example: If subscription starts on 7-Jan-2026:
 * - Cycle 1: 7-Jan to 6-Feb
 * - Cycle 2: 7-Feb to 6-Mar
 * - etc.
 *
 * @param subscriptionStart - Customer's subscription start date (YYYY-MM-DD)
 * @param targetDate - Date to find the billing cycle for
 * @returns { start: Date, end: Date } - The billing cycle period
 */
function getBillingCycle(subscriptionStart: string, targetDate: Date): { start: Date; end: Date } {
  const subStart = new Date(subscriptionStart);
  const target = new Date(targetDate);

  // Find which billing cycle the target date falls into
  let cycleStart = new Date(subStart);

  // Advance cycle start to the correct year/month
  while (true) {
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1); // Last day of cycle (e.g., 6-Feb if start is 7-Jan)

    if (target >= cycleStart && target <= cycleEnd) {
      return { start: cycleStart, end: cycleEnd };
    }

    // Move to next cycle
    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);

    // Safety check to prevent infinite loop
    if (cycleStart > target) {
      // Target is before subscription start, use first cycle
      return {
        start: new Date(subStart),
        end: new Date(new Date(subStart).setMonth(subStart.getMonth() + 1) - 86400000) // -1 day
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

    const response = {
      success: true,
      items: payouts,
      data: payouts,
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

    if (existingPayouts.length > 0) {
      if (allowRegeneration) {
        // Delete existing payouts for this period (testing mode)
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
        bonusCommission: mitraDB.mitraBonusCommission,
        baseRate: mitraDB.baseRate, // DEPRECATED - kept for backward compatibility
        monthlyBaseRate: mitraDB.monthlyBaseRate, // NEW - monthly rate
        bonusRate: mitraDB.bonusRate, // NEW - bonus rate
      })
      .from(mitraDB)
      .where(eq(mitraDB.isActive, true));

    const payoutRecords = [];
    const payoutAdjustmentsMap = new Map<string, any[]>(); // Store adjustments by mitraId
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of month
    const lastDayOfMonth = monthEnd.toISOString().split('T')[0];

    console.log(`📅 Period: ${monthStart.toISOString().split('T')[0]} to ${lastDayOfMonth}`);

    for (const mitra of mitras) {
      console.log(`\n🔄 Processing payout for ${mitra.mitraName}...`);

      // Step 1: Get all completed visits for this mitra in the period (with customer info)
      const completedVisits = await db
        .select({
          visitId: visitDB.id,
          customerId: visitDB.customerId,
          customerName: customerDB.customerName,
          subscriptionPackageId: customerDB.subscriptionPackageId,
          subscriptionPackage: customerDB.subscriptionPackage,
          scheduledDate: visitDB.scheduledDate,
          completedAt: visitDB.completedAt,
        })
        .from(visitDB)
        .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
        .where(
          and(
            eq(visitDB.actualMitraId, mitra.id), // Actually completed by this mitra
            eq(visitDB.status, 'Done'),
            gte(visitDB.completedAt, monthStart),
            lte(visitDB.completedAt, monthEnd)
          )
        );

      if (completedVisits.length === 0) {
        console.log(`⏭️  Skipping ${mitra.mitraName} - no completed visits`);
        continue;
      }

      // Step 2: Group visits by customer
      const customerVisitMap = new Map<string, typeof completedVisits>();
      completedVisits.forEach((visit) => {
        const customerId = visit.customerId;
        if (!customerVisitMap.has(customerId)) {
          customerVisitMap.set(customerId, []);
        }
        customerVisitMap.get(customerId)!.push(visit);
      });

      console.log(`   📋 Processing ${customerVisitMap.size} unique customers`);

      // Step 3: Calculate payout per customer (pro-rate by subscription package)
      let totalBasePayout = 0;
      let totalScheduledVisits = 0;
      let totalCompletedVisits = 0;
      const customerBreakdown: any[] = [];

      for (const [customerId, visits] of customerVisitMap.entries()) {
        const firstVisit = visits[0];
        const customerName = firstVisit.customerName || 'Unknown';
        const subscriptionPackageId = firstVisit.subscriptionPackageId;
        const subscriptionPackage = firstVisit.subscriptionPackage || 'Unknown';

        // Step 3a: Get customer's subscription start date to calculate billing cycle
        const customerData = await db
          .select({
            subscriptionStart: customerDB.subscriptionStart,
          })
          .from(customerDB)
          .where(eq(customerDB.id, customerId))
          .limit(1);

        if (!customerData.length || !customerData[0].subscriptionStart) {
          console.log(`   ⚠️  No subscription start date for ${customerName}, skipping`);
          continue;
        }

        const subscriptionStart = customerData[0].subscriptionStart;

        // Step 3b: Group visits by billing cycle (DYNAMIC!)
        // Each visit's billing cycle is determined by its SCHEDULED DATE, not payout month
        const billingCycleMap = new Map<string, {
          cycle: { start: Date; end: Date };
          visits: typeof visits;
        }>();

        for (const visit of visits) {
          const scheduledDate = new Date(visit.scheduledDate);
          const billingCycle = getBillingCycle(subscriptionStart, scheduledDate);
          const cycleKey = `${billingCycle.start.toISOString()}_${billingCycle.end.toISOString()}`;

          if (!billingCycleMap.has(cycleKey)) {
            billingCycleMap.set(cycleKey, {
              cycle: billingCycle,
              visits: []
            });
          }

          billingCycleMap.get(cycleKey)!.visits.push(visit);
        }

        console.log(`   📅 ${customerName}: ${billingCycleMap.size} billing cycle(s) in this payout month`);

        // Step 3c: Calculate payout for each billing cycle separately
        for (const [cycleKey, { cycle: billingCycle, visits: cycleVisits }] of billingCycleMap.entries()) {
          console.log(`   📅   Billing cycle: ${billingCycle.start.toISOString().split('T')[0]} to ${billingCycle.end.toISOString().split('T')[0]}`);

          // Step 3d: Get rate configuration for this mitra + subscription package combo
          const rateConfigs = await db
            .select({
              monthlyRate: mitraRateConfigDB.monthlyRate,
            })
            .from(mitraRateConfigDB)
            .where(
              and(
                eq(mitraRateConfigDB.mitraId, mitra.id),
                eq(mitraRateConfigDB.isActive, true),
                lte(mitraRateConfigDB.effectiveFrom, lastDayOfMonth),
                isNull(mitraRateConfigDB.effectiveTo),
                subscriptionPackageId
                  ? eq(mitraRateConfigDB.subscriptionPackageId, subscriptionPackageId)
                  : isNull(mitraRateConfigDB.subscriptionPackageId)
              )
            )
            .limit(1);

          // Fallback chain: specific config → default config → mitra base rate
          let monthlyRate = 0;
          if (rateConfigs.length > 0) {
            monthlyRate = Number(rateConfigs[0].monthlyRate);
          } else {
            // Try default config (subscriptionPackageId = NULL)
            const defaultConfig = await db
              .select({
                monthlyRate: mitraRateConfigDB.monthlyRate,
              })
              .from(mitraRateConfigDB)
              .where(
                and(
                  eq(mitraRateConfigDB.mitraId, mitra.id),
                  eq(mitraRateConfigDB.isActive, true),
                  lte(mitraRateConfigDB.effectiveFrom, lastDayOfMonth),
                  isNull(mitraRateConfigDB.effectiveTo),
                  isNull(mitraRateConfigDB.subscriptionPackageId)
                )
              )
              .limit(1);

            if (defaultConfig.length > 0) {
              monthlyRate = Number(defaultConfig[0].monthlyRate);
            } else {
              // Final fallback: mitra base rate
              monthlyRate = Number(mitra.monthlyBaseRate) || Number(mitra.baseRate) || 0;
            }
          }

          if (monthlyRate === 0) {
            console.log(`   ⚠️  No rate configured for ${customerName} (${subscriptionPackage}), skipping`);
            continue;
          }

          // Step 3e: Count scheduled visits for this customer in THIS BILLING CYCLE
          // FIXED BUG #1: Removed mitraId filter - denominator should be total scheduled visits
          //               regardless of which mitra, to handle mid-month mitra changes correctly
          // FIXED BUG #2: Use billing cycle dates (determined by visit's scheduledDate)
          //               to ensure prorate calculation matches invoice period
          // FIXED BUG #3: Dynamic billing cycle per visit, not per payout month
          const scheduledVisitsForCustomer = await db
            .select({ id: visitDB.id })
            .from(visitDB)
            .where(
              and(
                eq(visitDB.customerId, customerId),
                // NO mitraId filter here! Total scheduled for customer in billing period
                gte(visitDB.scheduledDate, billingCycle.start.toISOString().split('T')[0]),
                lte(visitDB.scheduledDate, billingCycle.end.toISOString().split('T')[0])
              )
            );

          const scheduled = scheduledVisitsForCustomer.length;
          const completed = cycleVisits.length; // Use cycleVisits (visits in this billing cycle)

          // Step 3f: Calculate pro-rate for this customer x billing cycle
          // Formula: (completed visits in this billing cycle / total scheduled in billing cycle) × monthly rate
          // Example: Jan 2026 payout with billing cycle 7-Jan to 6-Feb (9 scheduled)
          //          Visit 1-8 completed in Jan → 8/9 × Rp 900,000 = Rp 800,000
          //          Visit 9 completed in Feb → 1/9 × Rp 900,000 = Rp 100,000
          const denominator = scheduled > 0 ? scheduled : completed;
          const customerPayout = (completed / denominator) * monthlyRate;

          totalBasePayout += customerPayout;
          totalScheduledVisits += scheduled;
          totalCompletedVisits += completed;

          customerBreakdown.push({
            customerId,
            customerName,
            subscriptionPackage,
            billingCycleStart: billingCycle.start.toISOString().split('T')[0],
            billingCycleEnd: billingCycle.end.toISOString().split('T')[0],
            scheduledVisits: scheduled,
            completedVisits: completed,
            monthlyRate,
            payout: customerPayout,
          });

          console.log(`   ✓ ${customerName} (${subscriptionPackage}): ${completed}/${scheduled} visits × Rp${monthlyRate.toLocaleString()} = Rp${customerPayout.toLocaleString()} [Billing: ${billingCycle.start.toISOString().split('T')[0]} to ${billingCycle.end.toISOString().split('T')[0]}]`);
        } // End billing cycle loop
      } // End customer loop

      if (totalBasePayout === 0) {
        console.log(`⏭️  Skipping ${mitra.mitraName} - total payout is 0`);
        continue;
      }


      const bonusEligible = mitra.bonusCommission === 'Eligible';
      // Use configured bonus rate as default if eligible
      let bonusAmount = (bonusEligible && mitra.bonusRate) ? Number(mitra.bonusRate) : 0;

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

      const payoutRecord = {
        payoutId,
        mitraId: mitra.id,
        year,
        month,
        payoutDate: lastDayOfMonth,
        monthlyRate: '0', // Not applicable anymore (different rates per customer)
        scheduledVisits: totalScheduledVisits,
        totalVisits: totalCompletedVisits,
        pricePerVisit: '0', // DEPRECATED
        basePayout: finalBasePayout.toString(),
        bonusAmount: bonusAmount.toString(),
        totalPayout: finalTotalPayout.toString(),
        status: 'Pending',
        bonusEligible,
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
