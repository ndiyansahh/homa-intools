import fs from 'fs';
import path from 'path';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface MigrationFile {
  name: string;
  path: string;
  order: number;
}

async function runMigration() {
  console.log('🚀 Starting HOMA database migration...');
  
  try {
    // Check database connection
    const client = await pool.connect();
    console.log('✅ Database connection established');
    
    // Get list of SQL files in order
    const tablesDir = path.join(process.cwd(), 'sql', 'tables');
    const files = fs.readdirSync(tablesDir)
      .filter(file => file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(tablesDir, file),
        order: parseInt(file.split('_')[0])
      }))
      .sort((a, b) => a.order - b.order);

    console.log(`📋 Found ${files.length} migration files:`);
    files.forEach(file => console.log(`   ${file.order}. ${file.name}`));

    // Run migrations in transaction
    await client.query('BEGIN');
    
    try {
      // Enable extensions first
      console.log('\n🔧 Enabling PostgreSQL extensions...');
      await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
      await client.query('SET timezone = \'Asia/Jakarta\'');
      
      // Run each migration file
      for (const file of files) {
        console.log(`\n📄 Running ${file.name}...`);
        const sql = fs.readFileSync(file.path, 'utf8');
        await client.query(sql);
        console.log(`✅ ${file.name} completed`);
      }
      
      // Create utility views
      console.log('\n📊 Creating utility views...');
      
      const viewsSQL = `
        -- Active customers view
        CREATE OR REPLACE VIEW active_customers AS
        SELECT * FROM customer_db 
        WHERE is_active = true AND is_deleted = false;

        -- Active mitras view
        CREATE OR REPLACE VIEW active_mitras AS  
        SELECT * FROM mitra_db
        WHERE is_active = true AND is_deleted = false;

        -- Pending invoices view
        CREATE OR REPLACE VIEW pending_invoices AS
        SELECT * FROM invoice_db
        WHERE status IN ('Pending', 'Overdue') AND is_deleted = false;

        -- Today's schedule view
        CREATE OR REPLACE VIEW today_schedule AS
        SELECT 
            asd.*,
            cd.contact as customer_contact,
            md.contact as mitra_contact
        FROM attendance_schedule_db asd
        JOIN customer_db cd ON asd.customer_id = cd.id
        JOIN mitra_db md ON asd.mitra_id = md.id
        WHERE asd.scheduled_date = CURRENT_DATE
        AND asd.status IN ('Scheduled', 'In Progress')
        AND asd.is_deleted = false;

        -- Sample data function
        CREATE OR REPLACE FUNCTION insert_sample_data()
        RETURNS void AS $$
        BEGIN
            RAISE NOTICE 'Sample data can be inserted using: npm run db:seed';
            RAISE NOTICE 'Or manually by running: tsx scripts/seed.ts';
        END;
        $$ LANGUAGE plpgsql;
      `;
      
      await client.query(viewsSQL);
      
      await client.query('COMMIT');
      console.log('\n✨ Migration completed successfully!');
      
      // Check created tables
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      
      console.log('\n📋 Created tables:');
      result.rows.forEach(row => console.log(`   - ${row.table_name}`));
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
  
  console.log('\n🎉 Database migration completed successfully!');
  console.log('💡 Next steps:');
  console.log('   1. Run: npm run db:seed (to insert sample data)');
  console.log('   2. Test: curl http://localhost:3000/api/db/test');
}

// Run migration if called directly
if (require.main === module) {
  runMigration();
}

export { runMigration };