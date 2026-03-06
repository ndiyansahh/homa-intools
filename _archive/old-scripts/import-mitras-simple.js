const { Pool } = require('pg');

async function importMitrasSimple() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Checking mitra table structure...');
    
    // Get table structure
    const columns = await pool.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'mitra_db'
      ORDER BY ordinal_position
    `);
    console.log('Available columns:', columns.rows);

    // Insert mitras with simple data that matches available columns
    const mitras = [
      {
        mitra_name: 'Syeila Nurhasanah',
        phone: '6281291662589',
        address: 'Jl. Kebon Jeruk No. 123, Jakarta Barat',
        city: 'Jakarta',
        mitra_type: 'Cleaner',
        status: 'Active'
      },
      {
        mitra_name: 'Ahmad Rizki', 
        phone: '6281234567890',
        address: 'Jl. Sudirman No. 456, Jakarta Pusat',
        city: 'Jakarta',
        mitra_type: 'Cleaner',
        status: 'Active'
      }
    ];

    for (const mitra of mitras) {
      // Check if mitra exists
      const existing = await pool.query(`
        SELECT id FROM mitra_db WHERE mitra_name = $1
      `, [mitra.mitra_name]);

      if (existing.rows.length > 0) {
        console.log(`✓ Mitra ${mitra.mitra_name} already exists, skipping`);
        continue;
      }

      // Insert with basic columns that exist
      const result = await pool.query(`
        INSERT INTO mitra_db (
          mitra_name, contact, address, city, mitra_type, status,
          base_rate, commission_rate, is_active, is_deleted, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
        ) RETURNING id, mitra_name
      `, [
        mitra.mitra_name, mitra.phone, mitra.address, mitra.city, 
        mitra.mitra_type, mitra.status, '150000', '10.00', true, false
      ]);

      console.log(`✓ Imported mitra: ${result.rows[0].mitra_name} (ID: ${result.rows[0].id})`);
    }

    console.log('Simple mitras import completed!');

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

importMitrasSimple();