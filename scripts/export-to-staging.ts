import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import {
  regionDB,
  subscriptionPackageDB,
  customerDB,
  mitraDB,
  invoiceDB,
  attendanceScheduleDB,
  attendanceRecordDB,
  mitraPayoutDB,
  visitDB,
  payoutDB,
  visitMitraChangeHistoryDB,
  auditLogDB,
} from '../src/lib/schema';

// Load local environment
dotenv.config({ path: '.env.local' });

// Local database connection (from .env.local)
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Staging database connection (VPS via SSH tunnel)
// First run: ssh -L 5433:localhost:5432 root@194.233.68.67
// This forwards local port 5433 -> VPS port 5432
const stagingPool = new Pool({
  host: 'localhost',
  port: 5433, // Local forwarded port
  database: 'homa_staging',
  user: 'homa_user',
  password: 'HomaDB@2025!Secure',
});

const localDb = drizzle(localPool);
const stagingDb = drizzle(stagingPool);

async function exportToStaging() {
  console.log('🚀 Starting data export from local to staging...\n');

  try {
    // 1. Export subscription packages
    console.log('📦 Exporting subscription_package_db...');
    const packages = await localDb.select().from(subscriptionPackageDB);
    if (packages.length > 0) {
      await stagingDb.insert(subscriptionPackageDB).values(packages);
      console.log(`   ✅ Exported ${packages.length} subscription packages`);
    } else {
      console.log('   ⚠️  No subscription packages found');
    }

    // 2. Export regions
    console.log('📍 Exporting region_db...');
    const regions = await localDb.select().from(regionDB);
    if (regions.length > 0) {
      await stagingDb.insert(regionDB).values(regions);
      console.log(`   ✅ Exported ${regions.length} regions`);
    } else {
      console.log('   ⚠️  No regions found');
    }

    // 3. Export mitras
    console.log('👷 Exporting mitra_db...');
    const mitras = await localDb.select().from(mitraDB);
    if (mitras.length > 0) {
      await stagingDb.insert(mitraDB).values(mitras);
      console.log(`   ✅ Exported ${mitras.length} mitras`);
    } else {
      console.log('   ⚠️  No mitras found');
    }

    // 4. Export customers
    console.log('👥 Exporting customer_db...');
    const customers = await localDb.select().from(customerDB);
    if (customers.length > 0) {
      await stagingDb.insert(customerDB).values(customers);
      console.log(`   ✅ Exported ${customers.length} customers`);
    } else {
      console.log('   ⚠️  No customers found');
    }

    // 5. Export visits
    console.log('📅 Exporting visit_db...');
    const visits = await localDb.select().from(visitDB);
    if (visits.length > 0) {
      await stagingDb.insert(visitDB).values(visits);
      console.log(`   ✅ Exported ${visits.length} visits`);
    } else {
      console.log('   ⚠️  No visits found');
    }

    // 6. Export invoices
    console.log('💰 Exporting invoice_db...');
    const invoices = await localDb.select().from(invoiceDB);
    if (invoices.length > 0) {
      await stagingDb.insert(invoiceDB).values(invoices);
      console.log(`   ✅ Exported ${invoices.length} invoices`);
    } else {
      console.log('   ⚠️  No invoices found');
    }

    // 7. Export payouts
    console.log('💸 Exporting payout_db...');
    const payouts = await localDb.select().from(payoutDB);
    if (payouts.length > 0) {
      await stagingDb.insert(payoutDB).values(payouts);
      console.log(`   ✅ Exported ${payouts.length} payouts`);
    } else {
      console.log('   ⚠️  No payouts found');
    }

    // 8. Export mitra payouts
    console.log('💵 Exporting mitra_payout_db...');
    const mitraPayouts = await localDb.select().from(mitraPayoutDB);
    if (mitraPayouts.length > 0) {
      await stagingDb.insert(mitraPayoutDB).values(mitraPayouts);
      console.log(`   ✅ Exported ${mitraPayouts.length} mitra payouts`);
    } else {
      console.log('   ⚠️  No mitra payouts found');
    }

    // 9. Export attendance schedules
    console.log('📋 Exporting attendance_schedule_db...');
    const schedules = await localDb.select().from(attendanceScheduleDB);
    if (schedules.length > 0) {
      await stagingDb.insert(attendanceScheduleDB).values(schedules);
      console.log(`   ✅ Exported ${schedules.length} attendance schedules`);
    } else {
      console.log('   ⚠️  No attendance schedules found');
    }

    // 10. Export attendance records
    console.log('✅ Exporting attendance_record_db...');
    const records = await localDb.select().from(attendanceRecordDB);
    if (records.length > 0) {
      await stagingDb.insert(attendanceRecordDB).values(records);
      console.log(`   ✅ Exported ${records.length} attendance records`);
    } else {
      console.log('   ⚠️  No attendance records found');
    }

    // 11. Export visit mitra change history
    console.log('🔄 Exporting visit_mitra_change_history_db...');
    const changeHistory = await localDb.select().from(visitMitraChangeHistoryDB);
    if (changeHistory.length > 0) {
      await stagingDb.insert(visitMitraChangeHistoryDB).values(changeHistory);
      console.log(`   ✅ Exported ${changeHistory.length} change history records`);
    } else {
      console.log('   ⚠️  No change history found');
    }

    // 12. Export audit logs
    console.log('📜 Exporting audit_log_db...');
    const auditLogs = await localDb.select().from(auditLogDB);
    if (auditLogs.length > 0) {
      await stagingDb.insert(auditLogDB).values(auditLogs);
      console.log(`   ✅ Exported ${auditLogs.length} audit logs`);
    } else {
      console.log('   ⚠️  No audit logs found');
    }

    console.log('\n🎉 Data export completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Subscription Packages: ${packages.length}`);
    console.log(`   Regions: ${regions.length}`);
    console.log(`   Mitras: ${mitras.length}`);
    console.log(`   Customers: ${customers.length}`);
    console.log(`   Visits: ${visits.length}`);
    console.log(`   Invoices: ${invoices.length}`);
    console.log(`   Payouts: ${payouts.length}`);
    console.log(`   Mitra Payouts: ${mitraPayouts.length}`);
    console.log(`   Attendance Schedules: ${schedules.length}`);
    console.log(`   Attendance Records: ${records.length}`);
    console.log(`   Change History: ${changeHistory.length}`);
    console.log(`   Audit Logs: ${auditLogs.length}`);

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    throw error;
  } finally {
    await localPool.end();
    await stagingPool.end();
  }
}

// Run export
exportToStaging()
  .then(() => {
    console.log('\n✅ All done! Check staging database at: http://staging.intools.homa.co.id');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });
