import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { customerDB, subscriptionPackageDB } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

const parseDate = (s: string): string => {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const [d, m, y] = s.trim().split('-');
  return `${y}-${months[m]}-${d.padStart(2, '0')}`;
};

const cleanPhone = (s: string): string => s.replace(/[\s\-]/g, '').substring(0, 20);

const CUSTOMERS = [
  { name: 'Aom Chuthatuch via Altrix', acquisition: 'Altrix', phone: '+66 80 266 6477', address: 'The Capital Residence, Tower 3, Unit 6A', village: 'Senayan', district: 'Kebayoran Baru', city: 'Jakarta Selatan', postalCode: '12190', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, firstDate: '7-Jan-2023' },
  { name: 'Natsarin Wittayathaworn via Altrix', acquisition: 'Altrix', phone: '+66 81 890 2099', address: 'Apartemen Casa Domaine, Tower 1 Unit 19C', village: 'Karet Tengsin', district: 'Tanah Abang', city: 'Jakarta Pusat', postalCode: '10250', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, firstDate: '11-Jan-2023' },
  { name: 'Kun Ronnie via Altrix', acquisition: 'Altrix', phone: '+62 817-5762-324', address: 'Essence Dharmawangsa, East Tower, 22E', village: 'Ciptete Utara', district: 'Kebayoran Baru', city: 'Jakarta Selatan', postalCode: '12150', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '6-May-2023' },
  { name: 'Yosuke Fukada', acquisition: 'HOMA', phone: '+62 877-8106-4968', address: 'Kebayoran Harmony, Blok A-05', village: 'Pd. Aren', district: 'Pd. Aren', city: 'Tangerang Selatan', postalCode: '15224', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, firstDate: '9-May-2023' },
  { name: 'Janina', acquisition: 'HOMA', phone: '+62 812-9614-7199', address: 'Apartemen Simprug Indah, Unit 2607', village: 'Grogol Selatan', district: 'Kebayoran Lama', city: 'Jakarta Selatan', postalCode: '12220', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '24-May-2023' },
  { name: 'Masaru Kurokawa', acquisition: 'Altrix', phone: '+62 811-8767-215', address: 'Apartemen Casa Domaine, Tower 1 Unit 12C', village: 'Karet Tengsin', district: 'Tanah Abang', city: 'Jakarta Pusat', postalCode: '10250', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, firstDate: '24-May-2023' },
  { name: 'Errin', acquisition: 'HOMA', phone: '+62 812-1009-6699', address: 'Jl. Kayu Putih Selatan Kav. 58 RT 06 / RW 06', village: 'Kayu Putih', district: 'Pulo Gadung', city: 'Jakarta Utara', postalCode: '13260', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '17-Jul-2023' },
  { name: 'Risa Matsuoka', acquisition: 'HOMA', phone: '+62 819-4706-1009', address: 'Anandamaya Residences, Tower 3, 35-B', village: 'Karet Tengsin', district: 'Tanah Abang', city: 'Jakarta Pusat', postalCode: '10220', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '23-Feb-2024' },
  { name: 'Monika', acquisition: 'HOMA', phone: '+62 852-1949-3252', address: 'Apartemen SQ Residence', village: 'Cilandak Barat', district: 'Cilandak', city: 'Jakarta Selatan', postalCode: '12430', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '21-Mar-2024' },
  { name: 'Minarti Prahara', acquisition: 'HOMA', phone: '+62 811-919-286', address: 'Jl. Alam Asri II SB 12', village: 'Pd. Pinang', district: 'Kebayoran Lama', city: 'Jakarta Selatan', postalCode: '12310', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, firstDate: '3-May-2024' },
  { name: 'Lesti M', acquisition: 'HOMA', phone: '+62 811-1919-137', address: 'Lavanya Hills Residence, Blok Aleza II No E-16', village: 'Gandul', district: 'Cinere', city: 'Depok', postalCode: '16514', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '3-Jul-2024' },
  { name: 'Wina', acquisition: 'HOMA', phone: '+62 852-8156-2826', address: 'Apartemen Paladian Park Tower G Unit 0202', village: 'Kelapa Gading Barat', district: 'Kelapa Gading', city: 'Jakarta Utara', postalCode: '14240', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, firstDate: '9-Jul-2024' },
  { name: 'Wanna', acquisition: 'HOMA', phone: '+62 812-9750-2878', address: 'Jl. Komp Perumahan Kimia Farma Blok E4 No. 9 Ciledug', village: 'Parung Serab', district: 'Ciledug', city: 'Tangerang', postalCode: '15153', pkg: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', qty: 1, firstDate: '24-Jul-2024' },
  { name: 'Yanuar', acquisition: 'HOMA', phone: '+62 811-9992-979', address: 'Jl. Tanjung Duren Utara 2B No.11', village: 'Tanjung Durent Utara', district: 'Grogol Petamburan', city: 'Jakarta Barat', postalCode: '11470', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '30-Jul-2024' },
  { name: 'Sri Murtiyani', acquisition: 'HOMA', phone: '+62 813-2037-2400', address: 'Jl. Tuyu No.50', village: 'Halim Perdana Kusumah', district: 'Makasar', city: 'Jakarta Timur', postalCode: '13610', pkg: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', qty: 1, firstDate: '5-Aug-2024' },
  { name: 'Novi', acquisition: 'HOMA', phone: '+62 855-1110-090', address: 'Jl. Kembang Indah J2A/12', village: 'Kembangan Selatan', district: 'Kembangan', city: 'Jakarta Barat', postalCode: '11610', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '25-Sep-2024' },
  { name: 'Petrajaya Wiratama', acquisition: 'HOMA', phone: '+62 812-1095-922', address: 'Apartemen Atap Merah (Redtop) Unit 1102', village: 'Kebon Kelapa', district: 'Gambir', city: 'Jakarta Pusat', postalCode: '10120', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '19-Oct-2024' },
  { name: 'A. Prasetyo Pamungkas', acquisition: 'HOMA', phone: '+62 817-6768-176', address: 'Jl. Kecipir Raya No.6', village: 'Cibodas Sari', district: 'Cibodas', city: 'Tangerang', postalCode: '15138', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '31-Oct-2024' },
  { name: 'Shinta', acquisition: 'HOMA', phone: '+62 852-2227-0787', address: 'DE ROYALDI VILLAGE No. A7', village: 'Muncul', district: 'Setu', city: 'Tangerang Selatan', postalCode: '15314', pkg: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', qty: 1, firstDate: '20-Dec-2024' },
];

async function main() {
  console.log('=== ETL: Customers ===\n');

  // Load all packages for lookup
  const packages = await db.select().from(subscriptionPackageDB);
  const pkgMap = new Map(packages.map(p => [p.subscriptionPackage, p]));
  console.log(`Loaded ${packages.length} packages for lookup\n`);

  // Load existing customers (match by name + contact to avoid duplicates)
  const existing = await db.select({ id: customerDB.id, customerName: customerDB.customerName, contact: customerDB.contact }).from(customerDB);
  console.log(`Existing customers in DB: ${existing.length}\n`);

  let inserted = 0;
  let skipped = 0;
  let pkgMissing = 0;

  for (const c of CUSTOMERS) {
    // Skip if already exists (match by name)
    const match = existing.find(e => e.customerName === c.name);
    if (match) {
      console.log(`  SKIP (exists): ${c.name}`);
      skipped++;
      continue;
    }

    const pkg = pkgMap.get(c.pkg);
    if (!pkg) {
      console.log(`  ERROR (pkg not found): ${c.name} → "${c.pkg}"`);
      pkgMissing++;
      continue;
    }

    const subscriptionStart = parseDate(c.firstDate);

    await db.insert(customerDB).values({
      customerName: c.name,
      contact: cleanPhone(c.phone),
      address: c.address,
      village: c.village || null,
      district: c.district || null,
      city: c.city,
      postalCode: c.postalCode || null,
      subscriptionPackageId: pkg.id,
      subscriptionPackage: pkg.subscriptionPackage,
      subscriptionStart,
      subscriptionStatus: 'Active',
      qtyPackage: c.qty,
      monthlyFee: pkg.priceNumeric,
      isActive: true,
      isDeleted: false,
      customerNotes: c.acquisition !== 'HOMA' ? `Acquisition: ${c.acquisition}` : null,
    });

    console.log(`  INSERTED: ${c.name} [${pkg.subscriptionPackage.substring(0, 40)}...] start: ${subscriptionStart}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, Package not found: ${pkgMissing}`);

  const final = await db.select({ id: customerDB.id, name: customerDB.customerName }).from(customerDB);
  console.log(`\nTotal customers in DB: ${final.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
