const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/homa_db',
});

async function runMigration() {
  try {
    console.log('🚀 Starting migration: Add trial conversion fields...');
    
    // Read the SQL migration file
    const migrationSQL = fs.readFileSync(path.join(__dirname, 'add-trial-conversion-fields.sql'), 'utf8');
    
    // Execute the migration
    await pool.query(migrationSQL);
    
    console.log('✅ Migration completed successfully!');
    console.log('📋 Added columns:');
    console.log('   - total_sessions (INTEGER DEFAULT 0)');
    console.log('   - chosen_days (TEXT for JSON array)');
    
    // Verify the migration
    const result = await pool.query(`
      SELECT column_name, data_type, column_default 
      FROM information_schema.columns 
      WHERE table_name = 'customer_db' 
        AND column_name IN ('total_sessions', 'chosen_days')
      ORDER BY column_name;
    `);
    
    console.log('🔍 Verification - New columns:');
    result.rows.forEach(row => {
      console.log(`   - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'NULL'})`);
    });
    
    // Check sample data
    const sampleData = await pool.query(`
      SELECT id, customer_name, subscription_status, total_sessions, chosen_days 
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      LIMIT 3;
    `);
    
    if (sampleData.rows.length > 0) {
      console.log('📊 Sample trial customers after migration:');
      sampleData.rows.forEach(row => {
        console.log(`   - ${row.customer_name}: sessions=${row.total_sessions}, days=${row.chosen_days}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the migration
runMigration().catch(console.error);