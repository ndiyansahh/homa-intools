const { Pool } = require('pg');

async function checkMitraData() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Checking mitra data...');

    // Check all mitras
    const mitras = await pool.query(`
      SELECT id, mitra_name, status, mitra_code, city_assignment 
      FROM mitra_db 
      ORDER BY mitra_name
    `);
    console.log('✓ All mitras:', mitras.rows);

    // Check if there are any customers with assigned mitra_ids
    const customersWithMitras = await pool.query(`
      SELECT COUNT(*) as count
      FROM customer_db 
      WHERE assigned_mitra_id IS NOT NULL
    `);
    console.log('✓ Customers with assigned mitras:', customersWithMitras.rows[0].count);

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkMitraData();