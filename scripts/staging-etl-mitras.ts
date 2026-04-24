import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { mitraDB, mitraRateConfigDB } from '../src/lib/schema';

const parseJoinDate = (s: string): string => {
  const months: Record<string, string> = {
    Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
    Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
  };
  const [d, m, y] = s.split('-');
  return `${y}-${months[m]}-${d.padStart(2, '0')}`;
};

const cleanPhone = (s: string): string => s.replace(/\s/g, '').substring(0, 20);

const MITRAS = [
  { joinDate: '18-Jan-2024', mitraCode: 'MITRA-202401-000028', nik: '3171075808820004', name: 'Siti Asih',             dob: '18/08/1982', address: 'Jl. Karet Pasar Baru Barat I, RT 06/RW 06, Karet Tengsin, Tanah Abang, Jakarta Pusat', phone: '087788133385', bank: 'BCA', accountNo: '5265237042',    holderName: 'Siti Asih',             rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '11-Apr-2023', mitraCode: 'MITRA-202304-000005', nik: '3403034507800003', name: 'Suminten Yulianingrum', dob: '05/07/1980', address: 'Jl. Terogong 3 No.25, RT 09/ RW 10 Cilandak Barat, Jakarta Selatan',                        phone: '083899781312', bank: 'BCA', accountNo: '7310872533',    holderName: 'Suminten Yulianingrum', rates: { trial: 100000, r1: 375000, r2: 720000,  r3: 1080000, r4: 1440000, r5: 1800000, r6: 2160000, r7: 2520000 } },
  { joinDate: '15-Sep-2025', mitraCode: 'MITRA-2020509-000105', nik: '3674044303830010', name: 'Rina Triana',          dob: '03/03/1983', address: 'Jl. Asmawi Hm, RT06/RW04, Sawah Baru, Ciputat, Tangerang Selatan',                           phone: '085803031983', bank: 'BCA', accountNo: '2180550138',    holderName: 'Rina Triana',           rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '24-Jun-2025', mitraCode: 'MITRA-2020506-000095', nik: '3174055506830005', name: 'Rohayani',             dob: '15/06/1983', address: 'Jl. Inpres 13B, Gaga, Larangan, Tangerang',                                                  phone: '085126191694', bank: 'BRI', accountNo: '092501032537530', holderName: 'Rohayani',             rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '24-Oct-2022', mitraCode: 'MITRA-202210-000001',  nik: '3315055903810001', name: 'Sulastri',             dob: '19/03/1981', address: 'Jl. Nenas No 307 Blok A Cinere, Cinere, Depok',                                              phone: '082135809572', bank: 'BCA', accountNo: '2670515811',    holderName: 'Sulastri',             rates: { trial: 100000, r1: 375000, r2: 720000,  r3: 1080000, r4: 1440000, r5: 1800000, r6: 2160000, r7: 2520000 } },
  { joinDate: '20-Mar-2024', mitraCode: 'MITRA-202403-000034',  nik: '3174076076841002', name: 'Ria Junaeni',          dob: '27/06/1984', address: 'Jl. Pandan No. 13 RT 014 / RW 009, Kramat Pela, Kebayoran Baru, Jakarta Selatan',             phone: '085710775667', bank: 'BCA', accountNo: '2370511643',    holderName: 'Ria Junaeni',          rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '4-Jul-2024',  mitraCode: 'MITRA-202407-000047',  nik: '3171035904780005', name: 'Marciane',             dob: '19/04/1978', address: 'Jl. Kampung Irian III no 32 RT.01/06 Serdang Kemayoran Jakarta Pusat',                       phone: '0895335561756', bank: 'BCA', accountNo: '0970774874',   holderName: 'Marciane',             rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '22-Apr-2025', mitraCode: 'MITRA-2020504-000085', nik: '3402045602890001', name: 'Sunarsih',             dob: '16/02/1987', address: 'Jl. Palapa 1 No.1 RT 014/RW 01, Kedoya Selatan, Kebon Jeruk, Jakarta Barat',                  phone: '085795056369', bank: 'BRI', accountNo: '331201016005537', holderName: 'Sunarsih',             rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '24-Sep-2025', mitraCode: 'MITRA-2020509-000106', nik: '3603126606810003', name: 'Annarul Nurjanati',    dob: '26/06/1981', address: 'Jl.Nanas 4 B.32/11 Pondok Makmur Kutabaru Pasar Kemis Tangerang',                             phone: '085187846551', bank: 'BCA', accountNo: '1087558070',    holderName: 'Annarul Nurjanati',    rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
  { joinDate: '14-May-2025', mitraCode: 'MITRA-2020505-000086', nik: '3674034706910001', name: 'Atika Yunianti',       dob: '07/06/1991', address: 'Jl. Pertanian No 34, RT 001/RW 021, Parigi Lama, Pondok Aren',                                phone: '081517043978', bank: 'BCA', accountNo: '6801462356',    holderName: 'Atika Yunianti',       rates: { trial: 100000, r1: 375000, r2: 675000,  r3: 1012500, r4: 1350000, r5: 1687500, r6: 2025000, r7: 2362500 } },
];

async function main() {
  console.log('=== Staging ETL: Mitras ===\n');

  const existing = await db.select({ id: mitraDB.id, mitraCode: mitraDB.mitraCode }).from(mitraDB);
  console.log(`Existing mitras in DB: ${existing.length}`);

  let inserted = 0;
  let skipped = 0;

  for (const m of MITRAS) {
    const byCode = existing.find(e => e.mitraCode === m.mitraCode);
    if (byCode) {
      console.log(`  SKIP (exists): ${m.name} [${m.mitraCode}]`);
      skipped++;
      continue;
    }

    const [rec] = await db.insert(mitraDB).values({
      mitraName: m.name.trim(),
      mitraCode: m.mitraCode,
      mitraNIK: m.nik,
      mitraGender: 'Wanita',
      mitraDOB: m.dob,
      mitraPhone: cleanPhone(m.phone).substring(0, 12),
      contact: cleanPhone(m.phone).substring(0, 20),
      address: m.address,
      mitraBankAccount: m.bank,
      mitraBankAccountNumber: m.accountNo,
      mitraBankHolderName: m.holderName,
      joinDate: parseJoinDate(m.joinDate),
      status: 'Active',
      isActive: true,
      isDeleted: false,
      trialRatePerVisit: m.rates.trial.toString(),
      monthlyBaseRate: m.rates.r2.toString(),
    }).returning({ id: mitraDB.id });

    await db.insert(mitraRateConfigDB).values([
      { mitraId: rec.id, visitsPerWeek: 0, payoutRate: m.rates.trial.toString() },
      { mitraId: rec.id, visitsPerWeek: 1, payoutRate: m.rates.r1.toString() },
      { mitraId: rec.id, visitsPerWeek: 2, payoutRate: m.rates.r2.toString() },
      { mitraId: rec.id, visitsPerWeek: 3, payoutRate: m.rates.r3.toString() },
      { mitraId: rec.id, visitsPerWeek: 4, payoutRate: m.rates.r4.toString() },
      { mitraId: rec.id, visitsPerWeek: 5, payoutRate: m.rates.r5.toString() },
      { mitraId: rec.id, visitsPerWeek: 6, payoutRate: m.rates.r6.toString() },
      { mitraId: rec.id, visitsPerWeek: 7, payoutRate: m.rates.r7.toString() },
    ]);

    console.log(`  INSERTED: ${m.name} [${m.mitraCode}]`);
    inserted++;
    existing.push({ id: rec.id, mitraCode: m.mitraCode });
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
