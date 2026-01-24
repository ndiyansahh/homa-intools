import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function applyMigration() {
  console.log('🚀 Applying migration 0002_mitra_rate_config.sql...');

  try {
    const client = await pool.connect();
    console.log('✅ Database connection established');

    // Read migration file
    const migrationPath = path.join(process.cwd(), 'drizzle/neon-migration/0002_mitra_rate_config.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📄 Executing migration...');

    // Split by statement-breakpoint and execute each statement
    const statements = sql.split('--> statement-breakpoint');

    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (statement) {
        console.log(`   Executing statement ${i + 1}/${statements.length}...`);
        try {
          await client.query(statement);
        } catch (error: any) {
          // Ignore errors for already existing columns/tables
          if (error.code === '42701' || error.code === '42P07') {
            console.log(`   ⚠️  Already exists, skipping...`);
          } else {
            throw error;
          }
        }
      }
    }

    console.log('✅ Migration applied successfully!');

    // Verify columns exist
    const checkColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'mitra_db'
      AND column_name IN ('monthly_base_rate', 'base_rate')
      ORDER BY column_name;
    `);

    console.log('\n📋 Mitra DB columns:');
    checkColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    const checkPayoutColumns = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'payout_db'
      AND column_name IN ('monthly_rate', 'scheduled_visits', 'breakdown')
      ORDER BY column_name;
    `);

    console.log('\n📋 Payout DB columns:');
    checkPayoutColumns.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type}`);
    });

    const checkTable = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_name = 'mitra_rate_config_db';
    `);

    if (checkTable.rows.length > 0) {
      console.log('\n✅ mitra_rate_config_db table created');
    }

    client.release();

  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('\n🎉 Migration completed successfully!');
}

applyMigration();
