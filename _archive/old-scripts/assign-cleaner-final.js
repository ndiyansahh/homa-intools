const { Pool } = require('pg');

async function assignCleanerFinal() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {

    // Get available mitras
    const mitras = await pool.query(`
      SELECT id, mitra_name 
      FROM mitra_db 
      WHERE status = 'Active' AND is_active = true AND is_deleted = false
    `);
    
    // Get trial customers without assigned cleaners
    const trials = await pool.query(`
      SELECT id, customer_name
      FROM customer_db 
      WHERE subscription_status IN ('Trial', 'Trial Scheduled')
      AND (is_deleted = false OR is_deleted IS NULL)
      AND assigned_mitra_id IS NULL
      LIMIT 5
    `);

    // Assign mitras to trials
    for (let i = 0; i < Math.min(trials.rows.length, mitras.rows.length); i++) {
      const trial = trials.rows[i];
      const mitra = mitras.rows[i % mitras.rows.length]; // Rotate through mitras

      const result = await pool.query(`
        UPDATE customer_db 
        SET assigned_mitra_id = $1,
            customer_notes = COALESCE(customer_notes, '') || ' - Assigned to: ' || $2
        WHERE id = $3
        RETURNING customer_name
      `, [mitra.id, mitra.mitra_name, trial.id]);

    }

    // Test a specific case
    if (trials.rows.length > 0 && mitras.rows.length > 0) {
      const testTrial = trials.rows[0];
      
      const testResult = await pool.query(`
        SELECT 
          c.id, 
          c.customer_name, 
          c.assigned_mitra_id,
          m.mitra_name as cleaner_name,
          m.status as cleaner_status
        FROM customer_db c
        LEFT JOIN mitra_db m ON c.assigned_mitra_id = m.id
        WHERE c.id = $1
      `, [testTrial.id]);
    }

  } catch (error) {
    console.error('Assignment failed:', error);
  } finally {
    await pool.end();
  }
}

assignCleanerFinal();