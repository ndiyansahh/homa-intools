import { config } from 'dotenv';
config({ path: '.env.local', override: false });
config({ path: '.env', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/db';
import { customerDB, mitraDB, mitraRateConfigDB } from '../src/lib/schema';

const FREE_TRIAL_CSV = 'tools/test-data/production-seed/phase2/trial-phase-2.csv';
const MITRA_DB_CSV   = 'tools/test-data/production-seed/phase2/mitra-phase2.csv';

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
// Helpers
// ---------------------------------------------------------------------------
const MONTHS: Record<string, string> = {
  Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
  Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
};

const parseDate = (s: string): string | null => {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!MONTHS[m]) return null;
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
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

const mapStatus = (csvStatus: string): string => {
  const s = csvStatus.trim();
  if (s === 'Converted') return 'Converted';
  if (s === 'Not Converted') return 'Not Converted';
  if (s === 'Cancelled') return 'Cancelled';
  return 'Trial';
};

// ---------------------------------------------------------------------------
// Step 1: Insert mitras from mitra-db-production.csv that are missing in DB
// ---------------------------------------------------------------------------
async function ensureMitras(neededNames: Set<string>): Promise<Map<string, string>> {
  console.log('\n--- Step 1: Ensure mitras exist in DB ---');

  // Load current mitra state from DB
  const existing = await db.select({ id: mitraDB.id, name: mitraDB.mitraName, code: mitraDB.mitraCode }).from(mitraDB);
  const mitraMap = new Map<string, string>(); // name → id
  existing.forEach(m => mitraMap.set(m.name.trim(), m.id));
  console.log(`   Mitras currently in DB: ${existing.length}`);

  // Find which needed names are missing
  const missing = [...neededNames].filter(n => n && !mitraMap.has(n));
  if (missing.length === 0) {
    console.log('   All mitras already in DB.');
    return mitraMap;
  }

  console.log(`   Missing mitras: ${missing.length} → looking up in mitra-db-production.csv`);

  // Load mitra master CSV
  const mitraDbContent = fs.readFileSync(path.join(__dirname, '..', MITRA_DB_CSV), 'utf-8');
  const mitraRows = parseCSV(mitraDbContent);
  const mitraMasterMap = new Map<string, Record<string, string>>();
  mitraRows.forEach(r => mitraMasterMap.set(r['Name'].trim(), r));

  // Load existing rate configs
  const existingRates = await db.select({ mitraId: mitraRateConfigDB.mitraId }).from(mitraRateConfigDB);
  const mitraIdsWithRates = new Set(existingRates.map(r => r.mitraId));

  let inserted = 0;
  const notInMasterCsv: string[] = [];

  for (const name of missing) {
    const r = mitraMasterMap.get(name);
    if (!r) {
      notInMasterCsv.push(name);
      continue;
    }

    const code = r['Mitra Code'].trim();
    const joinDate = parseJoinDate(r['Join Date']);
    const phone = cleanPhone(r['Phone']);
    const rates = [
      r['Rate_1x/week'], r['Rate_2x/week'], r['Rate_3x/week'], r['Rate_4x/week'],
      r['Rate_5x/week'], r['Rate_6x/week'], r['Rate_7x/week'],
    ];

    // Double-check by code in case already inserted under different name trim
    const existingByCode = existing.find(m => m.code === code);
    if (existingByCode) {
      mitraMap.set(name, existingByCode.id);
      if (!mitraIdsWithRates.has(existingByCode.id)) {
        for (let i = 0; i < rates.length; i++) {
          await db.insert(mitraRateConfigDB).values({ mitraId: existingByCode.id, visitsPerWeek: i + 1, payoutRate: parseRate(rates[i]) });
        }
        console.log(`   RATES BACKFILLED: ${name} [${code}]`);
      }
      continue;
    }

    const [ins] = await db.insert(mitraDB).values({
      mitraName:               name,
      mitraCode:               code,
      mitraNIK:                r['NIK'].trim(),
      mitraGender:             r['Gender'] as 'Pria' | 'Wanita',
      mitraDOB:                r['Born Date'].trim(),
      mitraPhone:              phone,
      joinDate,
      mitraPartnership:        'Full Time',
      mitraCityAssignment:     null,
      mitraLocationAssignment: null,
      address:                 r['Address'].trim(),
      mitraBankAccount:        r['Bank Account'].trim(),
      mitraBankAccountNumber:  r['Bank Account Number'].trim(),
      mitraBankHolderName:     r["Bank Holder's Name"].trim(),
      trialRatePerVisit:       parseRate(r['Rate_Free Trial']),
      mitraType:               'Cleaner',
      status:                  'Active',
      isActive:                true,
      isDeleted:               false,
    }).returning({ id: mitraDB.id });

    for (let i = 0; i < rates.length; i++) {
      await db.insert(mitraRateConfigDB).values({ mitraId: ins.id, visitsPerWeek: i + 1, payoutRate: parseRate(rates[i]) });
    }

    mitraMap.set(name, ins.id);
    console.log(`   INSERTED mitra: ${name} [${code}]`);
    inserted++;
  }

  if (notInMasterCsv.length > 0) {
    console.log(`\n   ⚠️  Not found in mitra-db-production.csv (${notInMasterCsv.length}) — will be unassigned:`);
    notInMasterCsv.forEach(n => console.log(`      - ${n}`));
  }

  console.log(`   Mitras inserted: ${inserted}`);
  return mitraMap;
}

// ---------------------------------------------------------------------------
// Step 2: Insert trial customers
// ---------------------------------------------------------------------------
async function seedTrialCustomers(rows: Record<string, string>[], mitraMap: Map<string, string>) {
  console.log('\n--- Step 2: Seed trial customers ---');

  const existing = await db
    .select({ customerName: customerDB.customerName, contact: customerDB.contact })
    .from(customerDB);
  const existingSet = new Set(existing.map(e => `${e.customerName.trim()}|${(e.contact ?? '').trim()}`));
  console.log(`   Existing customers in DB: ${existing.length}`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    const name = row['Customer Name']?.trim() ?? '';
    const contact = row['Contact']?.trim() ?? '';

    if (!name) { skipped++; continue; }

    const key = `${name}|${contact}`;
    if (existingSet.has(key)) {
      console.log(`   ⏭️  Skip (exists): ${name}`);
      skipped++;
      continue;
    }

    const firstTrialDate = parseDate(row['First Trial'] ?? '');
    const secondTrialDate = parseDate(row['Second Trial'] ?? '');
    const subscriptionStatus = mapStatus(row['Status'] ?? '');

    const mitra1Name = row['Mitra / Cleaner 1']?.trim() ?? '';
    const mitra2Name = row['Mitra / Cleaner 2']?.trim() ?? '';
    const assignedMitraId = mitra1Name ? (mitraMap.get(mitra1Name) ?? null) : null;
    const backupMitraId   = mitra2Name ? (mitraMap.get(mitra2Name) ?? null) : null;
    const backupMitraIds  = backupMitraId ? [backupMitraId] : [];

    try {
      await db.insert(customerDB).values({
        customerName:         name,
        contact:              contact,
        address:              row['Address']?.trim() ?? '',
        city:                 row['City']?.trim() ?? '',
        district:             row['District']?.trim() || null,
        village:              row['Village']?.trim() || null,
        postalCode:           row['Postal Code']?.trim() || null,
        residentialType:      row['Residential Type']?.trim() || 'House',
        subscriptionPackage:  'Trial',
        subscriptionStart:    firstTrialDate,
        subscriptionEnd:      secondTrialDate,
        subscriptionStatus:   subscriptionStatus,
        assignedMitraId:      assignedMitraId,
        ...(backupMitraIds.length > 0 ? { backupMitraIds } : {}),
        monthlyFee:           '0',
        totalPaid:            '0',
        outstandingBalance:   '0',
        customerNotes:        `Trial customer - ${row['Acquisition']?.trim() ?? 'HOMA'} acquisition`,
        isActive:             true,
        isDeleted:            false,
      });
      console.log(`   ✅ ${name} (${firstTrialDate ?? '-'}, ${subscriptionStatus})`);
      existingSet.add(key);
      inserted++;
    } catch (err: any) {
      console.error(`   ❌ Error inserting ${name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`\n   Inserted: ${inserted} | Skipped: ${skipped} | Errors: ${errors}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ETL: Free Trials Phase 2 ===\n');

  const content = fs.readFileSync(path.join(__dirname, '..', FREE_TRIAL_CSV), 'utf-8');
  const rows = parseCSV(content);
  console.log(`📂 Loaded ${rows.length} rows from trial-phase-2.csv`);

  // Collect all unique mitra names referenced in the CSV
  const neededMitras = new Set<string>();
  for (const row of rows) {
    const m1 = row['Mitra / Cleaner 1']?.trim();
    const m2 = row['Mitra / Cleaner 2']?.trim();
    if (m1) neededMitras.add(m1);
    if (m2) neededMitras.add(m2);
  }
  console.log(`   Unique mitras referenced in CSV: ${neededMitras.size}`);

  const mitraMap = await ensureMitras(neededMitras);
  await seedTrialCustomers(rows, mitraMap);

  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(err => { console.error('Fatal error:', err); process.exit(1); });
