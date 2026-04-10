// @ts-nocheck
import { db } from '../src/lib/db';
import { payoutDB } from '../src/lib/schema';
import { sql, and, or, eq } from 'drizzle-orm';

async function checkPayoutRecords() {
  try {
    console.log('📊 Checking payout records by month...\n');

    // Get payout records grouped by month
    const result = await db.execute(sql`
      SELECT
        TO_CHAR(period_start, 'YYYY-MM') as period,
        COUNT(*) as count,
        MIN(period_start) as first_date,
        MAX(period_start) as last_date,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN status = 'Cancelled' THEN 1 ELSE 0 END) as cancelled_count
      FROM payout_db
      WHERE (is_deleted = false OR is_deleted IS NULL)
      GROUP BY TO_CHAR(period_start, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 12
    `);

    console.log('Period    | Count | First Date | Last Date  | Pending | Paid | Cancelled');
    console.log('----------|-------|------------|------------|---------|------|----------');

    for (const row of result.rows) {
      const period = row.period || 'N/A';
      const count = row.count || 0;
      const firstDate = row.first_date ? new Date(row.first_date).toISOString().split('T')[0] : 'N/A';
      const lastDate = row.last_date ? new Date(row.last_date).toISOString().split('T')[0] : 'N/A';
      const pending = row.pending_count || 0;
      const paid = row.paid_count || 0;
      const cancelled = row.cancelled_count || 0;

      console.log(`${period.padEnd(9)} | ${String(count).padStart(5)} | ${firstDate} | ${lastDate} | ${String(pending).padStart(7)} | ${String(paid).padStart(4)} | ${String(cancelled).padStart(9)}`);
    }

    // Check if February and March 2026 exist
    console.log('\n🔍 Checking specific months...\n');

    const feb2026 = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM payout_db
      WHERE TO_CHAR(period_start, 'YYYY-MM') = '2026-02'
        AND (is_deleted = false OR is_deleted IS NULL)
    `);

    const mar2026 = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM payout_db
      WHERE TO_CHAR(period_start, 'YYYY-MM') = '2026-03'
        AND (is_deleted = false OR is_deleted IS NULL)
    `);

    console.log(`February 2026: ${feb2026.rows[0]?.count || 0} records`);
    console.log(`March 2026: ${mar2026.rows[0]?.count || 0} records`);

    // Check total payout count
    console.log('\n📈 Total Statistics:\n');

    const totalCount = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        MIN(period_start) as earliest,
        MAX(period_start) as latest
      FROM payout_db
      WHERE (is_deleted = false OR is_deleted IS NULL)
    `);

    const total = totalCount.rows[0];
    console.log(`Total payouts: ${total?.total || 0}`);
    console.log(`Earliest period: ${total?.earliest ? new Date(total.earliest).toISOString().split('T')[0] : 'N/A'}`);
    console.log(`Latest period: ${total?.latest ? new Date(total.latest).toISOString().split('T')[0] : 'N/A'}`);

  } catch (error) {
    console.error('❌ Error checking payout records:', error);
    throw error;
  }
}

checkPayoutRecords()
  .then(() => {
    console.log('\n✅ Check complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
