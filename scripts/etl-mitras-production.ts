import { config } from 'dotenv';
config({ path: '.env.local', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { mitraDB, mitraRateConfigDB } from '../src/lib/schema';

const MITRA_DB_CSV = 'tools/test-data/production-seed/mitra-db-production.csv';

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

  // Load all mitras from mitra-db-production.csv — no attendance filter
  const mitraDbContent = fs.readFileSync(path.join(__dirname, '..', MITRA_DB_CSV), 'utf-8');
  const mitraRows = parseCSV(mitraDbContent);
  console.log(`Loaded ${mitraRows.length} rows from mitra-db-production.csv\n`);

  // Load existing mitras from DB
  const existing = await db.select({ id: mitraDB.id, mitraCode: mitraDB.mitraCode }).from(mitraDB);
  const existingMap = new Map(existing.map(m => [m.mitraCode, m.id]));
  console.log(`Existing mitras in DB: ${existing.length}\n`);

  // Load existing rate configs — to detect mitras with missing rates
  const existingRates = await db.select({ mitraId: mitraRateConfigDB.mitraId }).from(mitraRateConfigDB);
  const mitraIdsWithRates = new Set(existingRates.map(r => r.mitraId));

  let inserted = 0;
  let skipped = 0;
  let ratesBackfilled = 0;

  for (const r of mitraRows) {
    const code = r['Mitra Code'].trim();
    if (!code) continue;

    const rates = [
      r['Rate_1x/week'], r['Rate_2x/week'], r['Rate_3x/week'], r['Rate_4x/week'],
      r['Rate_5x/week'], r['Rate_6x/week'], r['Rate_7x/week'],
    ];

    const insertRates = async (mitraId: string) => {
      for (let i = 0; i < rates.length; i++) {
        await db.insert(mitraRateConfigDB).values({
          mitraId,
          visitsPerWeek: i + 1,
          payoutRate: parseRate(rates[i]),
        });
      }
    };

    if (existingMap.has(code)) {
      const mitraId = existingMap.get(code)!;
      if (!mitraIdsWithRates.has(mitraId)) {
        // Mitra exists but rate config is missing — backfill from CSV
        await insertRates(mitraId);
        console.log(`  RATES BACKFILLED: ${r['Name'].trim()} [${code}]`);
        ratesBackfilled++;
      } else {
        console.log(`  SKIP (exists + rates ok): ${code}`);
        skipped++;
      }
      continue;
    }

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

    await insertRates(ins.id);

    console.log(`  INSERTED: ${r['Name'].trim()} [${code}] join: ${joinDate}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Rates backfilled: ${ratesBackfilled}, Skipped: ${skipped}`);

  const final = await db.select({ id: mitraDB.id, name: mitraDB.mitraName, code: mitraDB.mitraCode }).from(mitraDB);
  console.log(`Total mitras in DB: ${final.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
