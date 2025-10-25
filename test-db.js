const { Pool } = require('pg');

async function testDatabase() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Testing database connection...');

    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✓ Database connected:', result.rows[0].now);

    // Check if customer_db table exists with new columns
    const tableInfo = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'customer_db'
      AND column_name IN ('assigned_mitra_id', 'backup_mitra_id')
    `);
    console.log('✓ New columns:', tableInfo.rows);

    // Check trial data count
    const trialCount = await pool.query(`
      SELECT COUNT(*) as count
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
    `);
    console.log('✓ Trial customers count:', trialCount.rows[0].count);

    // Check specific trial data
    const sampleTrial = await pool.query(`
      SELECT id, customer_name, subscription_status, assigned_mitra_id
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
      LIMIT 1
    `);
    console.log('✓ Sample trial:', sampleTrial.rows[0]);

  } catch (error) {
    console.error('Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testDatabase();