import { db } from '../src/lib/db';
import { mitraDB } from '../src/lib/schema';

/**
 * Seed sample active mitras for testing
 * Run with: npx tsx scripts/seed-mitras.ts
 */

const sampleMitras = [
  {
    mitraName: 'Siti Nurhaliza',
    mitraCode: `MITRA-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-001`,
    mitraNIK: '3201234567890001',
    mitraGender: 'Wanita',
    mitraDOB: '01/15/1990',
    mitraPhone: '081234567801',
    mitraBankAccount: 'BCA',
    mitraBankHolderName: 'Siti Nurhaliza',
    mitraBankAccountNumber: '1234567801',
    mitraCityAssignment: 'Jakarta Selatan',
    mitraLocationAssignment: JSON.stringify(['Kebayoran Baru', 'Cilandak', 'Mampang Prapatan']),
    mitraPartnership: 'Full Time',
    subscriptionType: 'Regular',
    monthlyBaseRate: '900000',
    mitraBonusCommission: 'Eligible',
    bonusRate: '50000',
    status: 'Active',
    isActive: true,
    isDeleted: false,
  },
  {
    mitraName: 'Budi Santoso',
    mitraCode: `MITRA-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-002`,
    mitraNIK: '3201234567890002',
    mitraGender: 'Pria',
    mitraDOB: '03/22/1988',
    mitraPhone: '081234567802',
    mitraBankAccount: 'Mandiri',
    mitraBankHolderName: 'Budi Santoso',
    mitraBankAccountNumber: '1234567802',
    mitraCityAssignment: 'Jakarta Pusat',
    mitraLocationAssignment: JSON.stringify(['Menteng', 'Tanah Abang', 'Gambir']),
    mitraPartnership: 'Full Time',
    subscriptionType: 'Regular',
    monthlyBaseRate: '900000',
    mitraBonusCommission: 'Eligible',
    bonusRate: '50000',
    status: 'Active',
    isActive: true,
    isDeleted: false,
  },
  {
    mitraName: 'Rina Wulandari',
    mitraCode: `MITRA-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-003`,
    mitraNIK: '3201234567890003',
    mitraGender: 'Wanita',
    mitraDOB: '07/10/1992',
    mitraPhone: '081234567803',
    mitraBankAccount: 'BNI',
    mitraBankHolderName: 'Rina Wulandari',
    mitraBankAccountNumber: '1234567803',
    mitraCityAssignment: 'Jakarta Utara',
    mitraLocationAssignment: JSON.stringify(['Kelapa Gading', 'Sunter', 'Ancol']),
    mitraPartnership: 'Part Time',
    subscriptionType: 'Basic',
    monthlyBaseRate: '700000',
    mitraBonusCommission: 'Not Eligible',
    bonusRate: '0',
    status: 'Active',
    isActive: true,
    isDeleted: false,
  },
  {
    mitraName: 'Ahmad Hidayat',
    mitraCode: `MITRA-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-004`,
    mitraNIK: '3201234567890004',
    mitraGender: 'Pria',
    mitraDOB: '11/05/1985',
    mitraPhone: '081234567804',
    mitraBankAccount: 'BRI',
    mitraBankHolderName: 'Ahmad Hidayat',
    mitraBankAccountNumber: '1234567804',
    mitraCityAssignment: 'Jakarta Barat',
    mitraLocationAssignment: JSON.stringify(['Kebon Jeruk', 'Grogol', 'Taman Sari']),
    mitraPartnership: 'Full Time',
    subscriptionType: 'Frequent',
    monthlyBaseRate: '1100000',
    mitraBonusCommission: 'Eligible',
    bonusRate: '75000',
    status: 'Active',
    isActive: true,
    isDeleted: false,
  },
  {
    mitraName: 'Dewi Lestari',
    mitraCode: `MITRA-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-005`,
    mitraNIK: '3201234567890005',
    mitraGender: 'Wanita',
    mitraDOB: '09/18/1991',
    mitraPhone: '081234567805',
    mitraBankAccount: 'BCA',
    mitraBankHolderName: 'Dewi Lestari',
    mitraBankAccountNumber: '1234567805',
    mitraCityAssignment: 'Jakarta Timur',
    mitraLocationAssignment: JSON.stringify(['Cakung', 'Matraman', 'Jatinegara']),
    mitraPartnership: 'Full Time',
    subscriptionType: 'Regular',
    monthlyBaseRate: '900000',
    mitraBonusCommission: 'Eligible',
    bonusRate: '50000',
    status: 'Active',
    isActive: true,
    isDeleted: false,
  },
];

async function seedMitras() {
  try {
    console.log('🧹 Seeding sample mitras...');
    console.log(`📊 Total mitras to seed: ${sampleMitras.length}`);
    console.log('');

    for (const mitra of sampleMitras) {
      await db.insert(mitraDB).values(mitra);
      console.log(`✅ Created: ${mitra.mitraName} (${mitra.mitraCode})`);
    }

    console.log('');
    console.log('✅ Sample mitras seeded successfully!');
    console.log('');
    console.log('📝 Summary:');
    console.log(`   Total: ${sampleMitras.length} mitras`);
    console.log(`   Full Time: ${sampleMitras.filter(m => m.mitraPartnership === 'Full Time').length}`);
    console.log(`   Part Time: ${sampleMitras.filter(m => m.mitraPartnership === 'Part Time').length}`);
    console.log(`   Bonus Eligible: ${sampleMitras.filter(m => m.mitraBonusCommission === 'Eligible').length}`);
    console.log('');
    console.log('🔍 You can now:');
    console.log('   - Assign mitras to customers');
    console.log('   - Create attendance schedules');
    console.log('   - Generate payouts');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding mitras:', error);
    process.exit(1);
  }
}

seedMitras();
