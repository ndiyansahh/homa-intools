const { Pool } = require('pg');

async function checkMitraSimple() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Checking mitra data...');

    // Check mitra table structure first
    const columns = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'mitra_db'
    `);
    console.log('✓ Mitra table columns:', columns.rows.map(r => r.column_name));

    // Check all mitras with basic columns
    const mitras = await pool.query(`
      SELECT id, mitra_name, status
      FROM mitra_db 
      ORDER BY mitra_name
      LIMIT 10
    `);
    console.log('✓ All mitras:', mitras.rows);

    // Get unique status values
    const statuses = await pool.query(`
      SELECT DISTINCT status 
      FROM mitra_db
    `);
    console.log('✓ Status values:', statuses.rows);

  } catch (error) {
    console.error('Check failed:', error);
  } finally {
    await pool.end();
  }
}

checkMitraSimple();