/**
 * Seed Payouts for January 2025 - February 2026
 *
 * This script generates payout records for all months from January 2025 to February 2026.
 *
 * IMPORTANT: This script bypasses authentication for seeding purposes.
 * Make sure you have visit data before running this script!
 */

import { db } from '../src/lib/db';
import { payoutDB, mitraDB, visitDB, mitraRateConfigDB, customerDB, payoutAdjustmentDB } from '../src/lib/schema';
import { eq, and, desc, gte, lte, isNull } from 'drizzle-orm';

// Color codes for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

/**
 * Calculate billing cycle
 */
function getBillingCycle(subscriptionStart: string, targetDate: Date): { start: Date; end: Date } {
  const subStart = new Date(subscriptionStart);
  const target = new Date(targetDate);

  let cycleStart = new Date(subStart);

  while (true) {
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1);

    if (target >= cycleStart && target <= cycleEnd) {
      return { start: cycleStart, end: cycleEnd };
    }

    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);

    if (cycleStart > target) {
      return {
        start: new Date(subStart),
        end: new Date(new Date(subStart).setMonth(subStart.getMonth() + 1) - 86400000)
      };
    }
  }
}

/**
 * Generate payouts for a specific month
 */
async function generatePayoutForMonth(year: number, month: number): Promise<{ success: boolean; count: number; message: string }> {
  try {
    console.log(`\n${colors.blue}${'═'.repeat(60)}${colors.reset}`);
    console.log(`${colors.cyan}🔄 Generating payouts for ${year}-${String(month).padStart(2, '0')}${colors.reset}`);
    console.log(`${colors.blue}${'═'.repeat(60)}${colors.reset}\n`);

    // Check if payouts already exist
    const existingPayouts = await db
      .select()
      .from(payoutDB)
      .where(and(eq(payoutDB.year, year), eq(payoutDB.month, month)))
      .limit(1);

    if (existingPayouts.length > 0) {
      console.log(`${colors.yellow}⏭️  Payouts already exist for this period${colors.reset}`);
      const count = await db
        .select()
        .from(payoutDB)
        .where(and(eq(payoutDB.year, year), eq(payoutDB.month, month)));
      return { success: false, count: count.length, message: 'Already exists' };
    }

    // Get all active mitras
    const mitras = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        bonusCommission: mitraDB.mitraBonusCommission,
        baseRate: mitraDB.baseRate,
        monthlyBaseRate: mitraDB.monthlyBaseRate,
        bonusRate: mitraDB.bonusRate,
      })
      .from(mitraDB)
      .where(eq(mitraDB.isActive, true));

    console.log(`${colors.magenta}👥 Found ${mitras.length} active mitras${colors.reset}\n`);

    const payoutRecords = [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const lastDayOfMonth = monthEnd.toISOString().split('T')[0];

    let mitraProcessed = 0;

    for (const mitra of mitras) {
      mitraProcessed++;
      console.log(`${colors.cyan}[${mitraProcessed}/${mitras.length}] Processing ${mitra.mitraName}...${colors.reset}`);

      // Get completed visits
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
            eq(visitDB.actualMitraId, mitra.id),
            eq(visitDB.status, 'Done'),
            gte(visitDB.completedAt, monthStart),
            lte(visitDB.completedAt, monthEnd)
          )
        );

      if (completedVisits.length === 0) {
        console.log(`  ${colors.yellow}⏭️  No completed visits${colors.reset}`);
        continue;
      }

      // Group by customer
      const customerVisitMap = new Map<string, typeof completedVisits>();
      completedVisits.forEach((visit) => {
        const customerId = visit.customerId;
        if (!customerVisitMap.has(customerId)) {
          customerVisitMap.set(customerId, []);
        }
        customerVisitMap.get(customerId)!.push(visit);
      });

      console.log(`  ${colors.blue}📋 ${customerVisitMap.size} customers, ${completedVisits.length} visits${colors.reset}`);

      // Calculate payout
      let totalBasePayout = 0;
      let totalScheduledVisits = 0;
      let totalCompletedVisits = 0;
      const customerBreakdown: any[] = [];

      for (const [customerId, visits] of customerVisitMap.entries()) {
        const firstVisit = visits[0];
        const customerName = firstVisit.customerName || 'Unknown';
        const subscriptionPackageId = firstVisit.subscriptionPackageId;
        const subscriptionPackage = firstVisit.subscriptionPackage || 'Unknown';

        const customerData = await db
          .select({ subscriptionStart: customerDB.subscriptionStart })
          .from(customerDB)
          .where(eq(customerDB.id, customerId))
          .limit(1);

        if (!customerData.length || !customerData[0].subscriptionStart) {
          console.log(`  ${colors.yellow}⚠️  No subscription start for ${customerName}${colors.reset}`);
          continue;
        }

        const subscriptionStart = customerData[0].subscriptionStart;

        // Group by billing cycle
        const billingCycleMap = new Map<string, { cycle: { start: Date; end: Date }; visits: typeof visits }>();

        for (const visit of visits) {
          const scheduledDate = new Date(visit.scheduledDate);
          const billingCycle = getBillingCycle(subscriptionStart, scheduledDate);
          const cycleKey = `${billingCycle.start.toISOString()}_${billingCycle.end.toISOString()}`;

          if (!billingCycleMap.has(cycleKey)) {
            billingCycleMap.set(cycleKey, { cycle: billingCycle, visits: [] });
          }

          billingCycleMap.get(cycleKey)!.visits.push(visit);
        }

        // Calculate per billing cycle
        for (const [_, { cycle: billingCycle, visits: cycleVisits }] of billingCycleMap.entries()) {
          // Get rate config
          const rateConfigs = await db
            .select({ monthlyRate: mitraRateConfigDB.monthlyRate })
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

          let monthlyRate = 0;
          if (rateConfigs.length > 0) {
            monthlyRate = Number(rateConfigs[0].monthlyRate);
          } else {
            const defaultConfig = await db
              .select({ monthlyRate: mitraRateConfigDB.monthlyRate })
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
              monthlyRate = Number(mitra.monthlyBaseRate) || Number(mitra.baseRate) || 0;
            }
          }

          if (monthlyRate === 0) continue;

          // Count scheduled visits
          const scheduledVisitsForCustomer = await db
            .select({ id: visitDB.id })
            .from(visitDB)
            .where(
              and(
                eq(visitDB.customerId, customerId),
                gte(visitDB.scheduledDate, billingCycle.start.toISOString().split('T')[0]),
                lte(visitDB.scheduledDate, billingCycle.end.toISOString().split('T')[0])
              )
            );

          const scheduled = scheduledVisitsForCustomer.length;
          const completed = cycleVisits.length;
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
        }
      }

      if (totalBasePayout === 0) {
        console.log(`  ${colors.yellow}⏭️  Total payout is 0${colors.reset}`);
        continue;
      }

      const bonusEligible = mitra.bonusCommission === 'Eligible';
      const bonusAmount = (bonusEligible && mitra.bonusRate) ? Number(mitra.bonusRate) : 0;
      const totalPayout = totalBasePayout + bonusAmount;

      // Generate payout ID
      const payoutId = `PO/${year}/${String(month).padStart(2, '0')}/${mitra.id.substring(0, 8).toUpperCase()}`;

      // Insert payout record
      await db.insert(payoutDB).values({
        payoutId,
        mitraId: mitra.id,
        year,
        month,
        payoutDate: lastDayOfMonth,
        scheduledVisits: totalScheduledVisits,
        totalVisits: totalCompletedVisits,
        pricePerVisit: totalScheduledVisits > 0 ? (totalBasePayout / totalCompletedVisits).toString() : '0',
        basePayout: totalBasePayout.toString(),
        bonusAmount: bonusAmount.toString(),
        totalPayout: totalPayout.toString(),
        status: 'Pending',
        bonusEligible,
        breakdown: JSON.stringify({ customers: customerBreakdown, adjustments: [] }),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      payoutRecords.push({ mitraName: mitra.mitraName, totalPayout });
      console.log(`  ${colors.green}✅ Rp${totalPayout.toLocaleString('id-ID')} (base: Rp${totalBasePayout.toLocaleString('id-ID')}, bonus: Rp${bonusAmount.toLocaleString('id-ID')})${colors.reset}`);
    }

    console.log(`\n${colors.green}✅ Generated ${payoutRecords.length} payout records${colors.reset}`);
    return { success: true, count: payoutRecords.length, message: 'Success' };

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
    return { success: false, count: 0, message: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}  🚀 PAYOUT SEEDING: January 2025 - February 2026${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);

  const results: Array<{ year: number; month: number; success: boolean; count: number; message: string }> = [];

  // 2025: January - December
  for (let month = 1; month <= 12; month++) {
    const result = await generatePayoutForMonth(2025, month);
    results.push({ year: 2025, month, ...result });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // 2026: January - February
  for (let month = 1; month <= 2; month++) {
    const result = await generatePayoutForMonth(2026, month);
    results.push({ year: 2026, month, ...result });
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  // Summary
  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.cyan}  📊 SUMMARY${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);

  const successful = results.filter(r => r.success);
  const skipped = results.filter(r => !r.success);
  const totalPayouts = successful.reduce((sum, r) => sum + r.count, 0);

  console.log(`${colors.green}✅ Successfully generated: ${successful.length} months${colors.reset}`);
  console.log(`${colors.yellow}⏭️  Skipped: ${skipped.length} months${colors.reset}`);
  console.log(`${colors.blue}📊 Total payout records: ${totalPayouts}${colors.reset}\n`);

  if (successful.length > 0) {
    console.log(`${colors.green}Generated:${colors.reset}`);
    successful.forEach(r => {
      const monthName = new Date(r.year, r.month - 1).toLocaleString('en-US', { month: 'short' });
      console.log(`  • ${monthName} ${r.year}: ${r.count} records`);
    });
  }

  if (skipped.length > 0) {
    console.log(`\n${colors.yellow}Skipped:${colors.reset}`);
    skipped.forEach(r => {
      const monthName = new Date(r.year, r.month - 1).toLocaleString('en-US', { month: 'short' });
      console.log(`  • ${monthName} ${r.year}: ${r.message}`);
    });
  }

  console.log(`\n${colors.cyan}${'═'.repeat(70)}${colors.reset}`);
  console.log(`${colors.green}✅ Seeding completed!${colors.reset}`);
  console.log(`${colors.cyan}${'═'.repeat(70)}${colors.reset}\n`);

  process.exit(0);
}

main().catch(error => {
  console.error(`${colors.red}❌ Fatal error:${colors.reset}`, error);
  process.exit(1);
});
