import { config } from 'dotenv';
config({ path: '.env.local', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/db';
import { mitraDB, mitraRateConfigDB } from '../src/lib/schema';

const ATTENDANCE_CSV = 'tools/test-data/production-seed/prod-attend-q2-2026.csv';
const MITRA_DB_CSV   = 'tools/test-data/production-seed/mitra_db.csv';

// ---------------------------------------------------------------------------
// CSV parser — handles multi-line quoted fields
// ---------------------------------------------------------------------------
function parseCSV(content: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur = '';
  let inQuote = false;
  let fields: string[] = [];

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(cur);
      cur = '';
    } else if ((ch === '\n' || ch === '\r') && !inQuote) {
      if (ch === '\r' && content[i + 1] === '\n') i++;
      fields.push(cur);
      cur = '';
      if (fields.some(f => f.trim())) rows.push(fields);
      fields = [];
    } else {
      cur += ch;
    }
  }
  if (cur || fields.length) {
    fields.push(cur);
    if (fields.some(f => f.trim())) rows.push(fields);
  }

  const header = rows[0].map(h => h.trim());
  return rows.slice(1).map(row => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => { obj[h] = (row[i] ?? '').trim(); });
    return obj;
  });
}

// ---------------------------------------------------------------------------
// Normalize mitra code: fix typo MITRA-2020501-xxx → MITRA-202501-xxx
// ---------------------------------------------------------------------------
const normalizeMitraCode = (code: string): string =>
  code.replace(/MITRA-202(0)(\d{3})-/, 'MITRA-202$2-');

// ---------------------------------------------------------------------------
// Extract mitra code from "Nama Mitra (MITRA-xxx)" format
// ---------------------------------------------------------------------------
const parseMitraCode = (raw: string): string | null => {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/\(([^)]+)\)/);
  return match ? normalizeMitraCode(match[1].trim()) : null;
};

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------
const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

const parseJoinDate = (s: string): string => {
  const [d, m, y] = s.trim().split('-');
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
};

const parseRate = (s: string): string => s.replace(/[^0-9]/g, '') || '0';

const cleanPhone = (s: string): string => {
  const waMatch = s.match(/WA[:\s]+0(\d+)/i);
  if (waMatch) return ('0' + waMatch[1]).substring(0, 12);
  return s.replace(/\D/g, '').substring(0, 12);
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ETL: Mitras Production (from CSV) ===\n');

  // Step 1: collect unique mitra codes needed from attendance CSV
  const attendContent = fs.readFileSync(path.join(__dirname, '..', ATTENDANCE_CSV), 'utf-8');
  const attendRows = parseCSV(attendContent);

  const neededCodes = new Set<string>();
  for (const row of attendRows) {
    // mitra_1 column
    const m1 = parseMitraCode(row['mitra_1'] ?? '');
    if (m1) neededCodes.add(m1);
    // backup_mitra_1..31
    for (let i = 1; i <= 31; i++) {
      const bm = parseMitraCode(row[`backup_mitra_${i}`] ?? '');
      if (bm) neededCodes.add(bm);
    }
  }
  console.log(`Mitra codes needed from attendance: ${neededCodes.size}`);
  console.log([...neededCodes].sort().join(', '), '\n');

  // Step 2: load mitra_db.csv and filter to needed codes
  const mitraDbContent = fs.readFileSync(path.join(__dirname, '..', MITRA_DB_CSV), 'utf-8');
  const mitraRows = parseCSV(mitraDbContent);
  console.log(`Loaded ${mitraRows.length} rows from mitra_db.csv`);

  const mitraMap = new Map(mitraRows.map(r => [r['Mitra Code'], r]));
  const toInsert = [...neededCodes].filter(code => mitraMap.has(code));
  const notFound = [...neededCodes].filter(code => !mitraMap.has(code));

  if (notFound.length > 0) {
    console.log(`\nWARN: ${notFound.length} mitra codes not found in mitra_db.csv:`);
    notFound.forEach(c => console.log(`  ${c}`));
  }
  console.log(`\nMitras to insert: ${toInsert.length}\n`);

  // Step 3: load existing mitras from DB
  const existing = await db.select({ id: mitraDB.id, mitraCode: mitraDB.mitraCode }).from(mitraDB);
  const existingCodes = new Set(existing.map(m => m.mitraCode));
  console.log(`Existing mitras in DB: ${existing.length}\n`);

  let inserted = 0;
  let skipped = 0;

  for (const code of toInsert.sort()) {
    if (existingCodes.has(code)) {
      console.log(`  SKIP (exists): ${code}`);
      skipped++;
      continue;
    }

    const r = mitraMap.get(code)!;
    const joinDate = parseJoinDate(r['Join Date']);
    const phone = cleanPhone(r['Phone']);

    const [ins] = await db.insert(mitraDB).values({
      mitraName:              r['Name'].trim(),
      mitraCode:              code,
      mitraNIK:               r['NIK'].trim(),
      mitraGender:            r['Gender'] as 'Pria' | 'Wanita',
      mitraDOB:               r['Born Date'].trim(),
      mitraPhone:             phone,
      joinDate,
      mitraPartnership:       'Full Time',
      mitraCityAssignment:    null,
      mitraLocationAssignment: null,
      address:                r['Address'].trim(),
      mitraBankAccount:       r['Bank Account'].trim(),
      mitraBankAccountNumber: r['Bank Account Number'].trim(),
      mitraBankHolderName:    r["Bank Holder's Name"].trim(),
      trialRatePerVisit:      parseRate(r['Rate_Free Trial']),
      mitraType:              'Cleaner',
      status:                 'Active',
      isActive:               true,
      isDeleted:              false,
    }).returning({ id: mitraDB.id });

    const rates = [
      r['Rate_1x/week'], r['Rate_2x/week'], r['Rate_3x/week'], r['Rate_4x/week'],
      r['Rate_5x/week'], r['Rate_6x/week'], r['Rate_7x/week'],
    ];
    for (let i = 0; i < rates.length; i++) {
      await db.insert(mitraRateConfigDB).values({
        mitraId: ins.id,
        visitsPerWeek: i + 1,
        payoutRate: parseRate(rates[i]),
      });
    }

    console.log(`  INSERTED: ${r['Name'].trim()} [${code}] join: ${joinDate}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);

  const final = await db.select({ id: mitraDB.id, name: mitraDB.mitraName, code: mitraDB.mitraCode }).from(mitraDB);
  console.log(`Total mitras in DB: ${final.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
