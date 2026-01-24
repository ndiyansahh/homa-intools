import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
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

// Local database connection
const localPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const localDb = drizzle(localPool);

// Helper to generate INSERT SQL
function generateInsertSQL(tableName: string, rows: any[]): string {
  if (rows.length === 0) return '';

  const columns = Object.keys(rows[0]);
  const values = rows.map(row => {
    const vals = columns.map(col => {
      const val = row[col];
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
      if (val instanceof Date) return `'${val.toISOString()}'`;
      return val;
    });
    return `(${vals.join(', ')})`;
  });

  return `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES\n${values.join(',\n')};\n\n`;
}

async function exportToSQL() {
  console.log('🚀 Exporting data to SQL file...\n');

  let sqlContent = '-- HOMA Data Export\n';
  sqlContent += `-- Generated: ${new Date().toISOString()}\n\n`;

  try {
    // Export subscription packages
    console.log('📦 Exporting subscription_package_db...');
    const packages = await localDb.select().from(subscriptionPackageDB);
    if (packages.length > 0) {
      sqlContent += generateInsertSQL('subscription_package_db', packages);
      console.log(`   ✅ ${packages.length} subscription packages`);
    }

    // Export regions
    console.log('📍 Exporting region_db...');
    const regions = await localDb.select().from(regionDB);
    if (regions.length > 0) {
      sqlContent += generateInsertSQL('region_db', regions);
      console.log(`   ✅ ${regions.length} regions`);
    }

    // Export mitras
    console.log('👷 Exporting mitra_db...');
    const mitras = await localDb.select().from(mitraDB);
    if (mitras.length > 0) {
      sqlContent += generateInsertSQL('mitra_db', mitras);
      console.log(`   ✅ ${mitras.length} mitras`);
    }

    // Export customers
    console.log('👥 Exporting customer_db...');
    const customers = await localDb.select().from(customerDB);
    if (customers.length > 0) {
      sqlContent += generateInsertSQL('customer_db', customers);
      console.log(`   ✅ ${customers.length} customers`);
    }

    // Export visits
    console.log('📅 Exporting visit_db...');
    const visits = await localDb.select().from(visitDB);
    if (visits.length > 0) {
      sqlContent += generateInsertSQL('visit_db', visits);
      console.log(`   ✅ ${visits.length} visits`);
    }

    // Write to file
    const filename = 'homa-staging-data.sql';
    fs.writeFileSync(filename, sqlContent);

    console.log(`\n✅ Export complete!`);
    console.log(`📄 File: ${filename}`);
    console.log(`📊 Size: ${(fs.statSync(filename).size / 1024).toFixed(2)} KB`);
    console.log(`\nNext steps:`);
    console.log(`1. scp ${filename} root@194.233.68.67:/tmp/`);
    console.log(`2. ssh root@194.233.68.67`);
    console.log(`3. PGPASSWORD='HomaDB@2025!Secure' psql -h localhost -U homa_user -d homa_staging -f /tmp/${filename}`);

  } catch (error) {
    console.error('\n❌ Export failed:', error);
    throw error;
  } finally {
    await localPool.end();
  }
}

exportToSQL()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
