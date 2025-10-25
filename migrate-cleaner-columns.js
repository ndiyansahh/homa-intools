// Migration script to add cleaner assignment columns to customerDB
const { Pool } = require('pg');

async function migrateCleaner() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('Starting cleaner columns migration...');

    // Add assignedMitraId and backupMitraId columns
    const queries = [
      'ALTER TABLE customer_db ADD COLUMN IF NOT EXISTS assigned_mitra_id UUID REFERENCES mitra_db(id)',
      'ALTER TABLE customer_db ADD COLUMN IF NOT EXISTS backup_mitra_id UUID REFERENCES mitra_db(id)'
    ];

    for (const query of queries) {
      try {
        console.log('Executing:', query);
        await pool.query(query);
        console.log('✓ Success');
      } catch (error) {
        if (error.code === '42701') {
          console.log('✓ Column already exists');
        } else {
          throw error;
        }
      }
    }

    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  migrateCleaner();
}

module.exports = { migrateCleaner };