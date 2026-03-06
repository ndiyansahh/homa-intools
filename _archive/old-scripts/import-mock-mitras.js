const { Pool } = require('pg');

const mitraData = [
  {
    id: '1',
    joinDate: '15/10/2022',
    mitraCode: 'MITRA-202210-000001',
    nik: '3171081506950002',
    name: 'Syeila Nurhasanah',
    gender: 'Wanita',
    bornDate: '15/06/1995',
    address: 'Jl. Kebon Jeruk No. 123, Jakarta Barat',
    phone: '6281291662589',
    bankAccount: 'BCA',
    bankAccountNumber: '5271236489',
    bankHoldersName: 'Syeila Nurhasanah',
    cityAssignment: 'Jakarta',
    locationAssignment: 'Jakarta Barat',
    partnershipTypes: 'Fulltime',
    status: 'ACTIVE',
    tenure: '12',
    bonus: 'Eligible',
    createdAt: '2022-10-15T10:00:00Z',
    updatedAt: '2022-10-15T10:00:00Z',
    isDeleted: false,
  },
  {
    id: '2',
    joinDate: '20/10/2022',
    mitraCode: 'MITRA-202210-000002',
    nik: '3172082107880003',
    name: 'Ahmad Rizki',
    gender: 'Pria',
    bornDate: '21/07/1988',
    address: 'Jl. Sudirman No. 456, Jakarta Pusat',
    phone: '6281234567890',
    bankAccount: 'Mandiri',
    bankAccountNumber: '1234567890',
    bankHoldersName: 'Ahmad Rizki',
    cityAssignment: 'Jakarta',
    locationAssignment: 'Jakarta Pusat',
    partnershipTypes: 'Partime',
    status: 'ACTIVE',
    tenure: '6',
    bonus: 'Eligible',
    createdAt: '2022-10-20T14:30:00Z',
    updatedAt: '2022-10-20T14:30:00Z',
    isDeleted: false,
  }
];

async function importMitras() {
  const pool = new Pool({
    connectionString: "postgresql://handisulyansah@localhost:5432/homa_db",
  });

  try {
    console.log('Importing mock mitras...');

    for (const mitra of mitraData) {
      // Check if mitra already exists
      const existing = await pool.query(`
        SELECT id FROM mitra_db WHERE id = $1 OR nik = $2
      `, [mitra.id, mitra.nik]);

      if (existing.rows.length > 0) {
        console.log(`✓ Mitra ${mitra.name} already exists, skipping`);
        continue;
      }

      // Insert new mitra
      const result = await pool.query(`
        INSERT INTO mitra_db (
          id, join_date, mitra_name, nik, gender, born_date,
          address, phone, bank_account, bank_account_number, bank_holders_name,
          city_assignment, location_assignment, partnership_types,
          status, tenure, bonus, city, contact,
          created_at, updated_at, is_deleted
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10, $11,
          $12, $13, $14,
          $15, $16, $17, $18, $19,
          $20, $21, $22
        )
      `, [
        mitra.id, mitra.joinDate, mitra.name, mitra.nik, mitra.gender, mitra.bornDate,
        mitra.address, mitra.phone, mitra.bankAccount, mitra.bankAccountNumber, mitra.bankHoldersName,
        mitra.cityAssignment, mitra.locationAssignment, mitra.partnershipTypes,
        mitra.status, mitra.tenure, mitra.bonus, mitra.cityAssignment, mitra.phone,
        new Date(mitra.createdAt), new Date(mitra.updatedAt), mitra.isDeleted
      ]);

      console.log(`✓ Imported mitra: ${mitra.name}`);
    }

    console.log('Mock mitras imported successfully!');

  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    await pool.end();
  }
}

importMitras();