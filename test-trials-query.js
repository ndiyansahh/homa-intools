const { Pool } = require('pg');

async function testTrialsQuery() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Testing trials query...');

    // Test the exact query from the API
    const result = await pool.query(`
      SELECT 
        c.id,
        c.customer_name,
        c.address,
        c.city,
        c.district,
        c.village,
        c.postal_code,
        c.subscription_status,
        c.customer_notes,
        c.assigned_mitra_id,
        c.backup_mitra_id,
        c.created_at,
        c.updated_at,
        m.mitra_name as assigned_mitra_name,
        m.status as assigned_mitra_status
      FROM customer_db c
      LEFT JOIN mitra_db m ON c.assigned_mitra_id = m.id
      WHERE c.subscription_status IN ('Trial Scheduled', 'Trial')
      AND (c.is_deleted = false OR c.is_deleted IS NULL)
      ORDER BY c.created_at DESC
      LIMIT 5
    `);
    
    console.log('✓ Query successful. Found', result.rows.length, 'trials');
    console.log('✓ Sample data:', result.rows[0] || 'No data');

    // Check if we have any trials with cleaners
    const withCleaners = result.rows.filter(r => r.assigned_mitra_name);
    console.log('✓ Trials with cleaners:', withCleaners.length);

    if (withCleaners.length > 0) {
      console.log('✓ Sample trial with cleaner:', {
        customerName: withCleaners[0].customer_name,
        cleanerName: withCleaners[0].assigned_mitra_name,
        cleanerStatus: withCleaners[0].assigned_mitra_status
      });
    }

  } catch (error) {
    console.error('Query test failed:', error);
  } finally {
    await pool.end();
  }
}

testTrialsQuery();