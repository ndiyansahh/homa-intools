import { db } from '../src/lib/db';
import { sql } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

async function runMigration() {
  try {
    console.log('🚀 Starting migration...');

    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../drizzle/manual-migration-visit-mitra-change.sql'),
      'utf-8'
    );

    // Execute the migration
    await db.execute(sql.raw(migrationSQL));

    console.log('✅ Migration completed successfully!');

    // Verification
    const result = await db.execute(sql`
      SELECT COUNT(*) as total_visits,
             COUNT(original_mitra_id) as has_original,
             COUNT(actual_mitra_id) as has_actual
      FROM visit_db;
    `);

    console.log('📊 Verification:', result.rows[0]);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
