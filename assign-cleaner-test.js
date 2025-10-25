const { Pool } = require('pg');

async function assignCleanerTest() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Testing cleaner assignment...');

    // Get available mitras
    const mitras = await pool.query(`
      SELECT id, mitra_name, status 
      FROM mitra_db 
      WHERE status = 'ACTIVE' 
      LIMIT 5
    `);
    console.log('✓ Available mitras:', mitras.rows);

    if (mitras.rows.length === 0) {
      console.log('No active mitras found');
      return;
    }

    // Get trial customers without assigned cleaners
    const trials = await pool.query(`
      SELECT id, customer_name
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
      AND assigned_mitra_id IS NULL
      LIMIT 5
    `);
    console.log('✓ Trials without cleaners:', trials.rows);

    // Assign first mitra to first trial
    if (trials.rows.length > 0 && mitras.rows.length > 0) {
      const trialId = trials.rows[0].id;
      const mitraId = mitras.rows[0].id;
      
      const result = await pool.query(`
        UPDATE customer_db 
        SET assigned_mitra_id = $1 
        WHERE id = $2
      `, [mitraId, trialId]);
      
      console.log('✓ Assigned mitra', mitras.rows[0].mitra_name, 'to trial', trials.rows[0].customer_name);
    }

  } catch (error) {
    console.error('Assignment test failed:', error);
  } finally {
    await pool.end();
  }
}

assignCleanerTest();