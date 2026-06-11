import { config } from 'dotenv';
config({ path: '.env.local', override: false });

import * as fs from 'fs';
import { db } from '../src/lib/db';
import { customerDB, mitraDB } from '../src/lib/schema';
import { eq, or } from 'drizzle-orm';

const FREE_TRIAL_CSV = 'tools/test-data/production-seed/free-trial-db.csv';

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

const parseDate = (s: string): string | null => {
  const trimmed = s.trim();
  if (!trimmed) return null;
  const parts = trimmed.split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!MONTHS[m]) return null;
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
};

const getYear = (dateStr: string): number | null => {
  const parsed = parseDate(dateStr);
  if (!parsed) return null;
  return parseInt(parsed.split('-')[0]);
};

// ---------------------------------------------------------------------------
// Status mapping
// ---------------------------------------------------------------------------
const mapStatus = (csvStatus: string): string => {
  const s = csvStatus.trim();
  if (s === 'Converted') return 'Converted';
  if (s === 'Not Converted') return 'Not Converted';
  if (s === 'Cancelled') return 'Cancelled';
  return 'Trial';
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('📂 Reading free-trial-db.csv...');
  const content = fs.readFileSync(FREE_TRIAL_CSV, 'utf-8');
  const rows = parseCSV(content);
  console.log(`   Total rows in CSV: ${rows.length}`);

  // Filter: only rows where First Trial OR Second Trial is in 2026
  const rows2026 = rows.filter(row => {
    const firstTrialYear = getYear(row['First Trial'] ?? '');
    const secondTrialYear = getYear(row['Second Trial'] ?? '');
    return firstTrialYear === 2026 || secondTrialYear === 2026;
  });

  console.log(`   Rows with 2026 trial dates: ${rows2026.length}`);

  if (rows2026.length === 0) {
    console.log('⚠️  No 2026 trial data found. Exiting.');
    process.exit(0);
  }

  // Pre-load all mitras for name → id lookup
  console.log('\n🔍 Loading mitras from DB...');
  const allMitras = await db.select({ id: mitraDB.id, name: mitraDB.mitraName }).from(mitraDB);
  const mitraMap = new Map<string, string>();
  allMitras.forEach(m => mitraMap.set(m.name.trim(), m.id));
  console.log(`   Loaded ${allMitras.size ?? mitraMap.size} mitras`);

  // Load existing trial customers to avoid duplicates (match by name + contact)
  console.log('\n🔍 Loading existing trial customers...');
  const existing = await db
    .select({ customerName: customerDB.customerName, contact: customerDB.contact })
    .from(customerDB);
  const existingSet = new Set(existing.map(e => `${e.customerName.trim()}|${(e.contact ?? '').trim()}`));
  console.log(`   Existing customers in DB: ${existing.length}`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  console.log('\n🚀 Inserting trial customers...\n');

  for (const row of rows2026) {
    const name = row['Customer Name']?.trim() ?? '';
    const contact = row['Contact']?.trim() ?? '';

    if (!name) {
      console.log('   ⚠️  Skipping row with empty name');
      skipped++;
      continue;
    }

    const key = `${name}|${contact}`;
    if (existingSet.has(key)) {
      console.log(`   ⏭️  Skip (exists): ${name}`);
      skipped++;
      continue;
    }

    const firstTrialDate = parseDate(row['First Trial'] ?? '');
    const secondTrialDate = parseDate(row['Second Trial'] ?? '');
    const csvStatus = row['Status']?.trim() ?? '';
    const subscriptionStatus = mapStatus(csvStatus);

    // Determine trial date (First Trial if 2026, else Second Trial)
    const trialDate = firstTrialDate ?? secondTrialDate;

    // Mitra lookup
    const mitra1Name = row['Mitra / Cleaner 1']?.trim() ?? '';
    const mitra2Name = row['Mitra / Cleaner 2']?.trim() ?? '';
    const assignedMitraId = mitra1Name ? (mitraMap.get(mitra1Name) ?? null) : null;
    const backupMitraId = mitra2Name ? (mitraMap.get(mitra2Name) ?? null) : null;
    const backupMitraIds = backupMitraId ? [backupMitraId] : [];

    if (mitra1Name && !assignedMitraId) {
      console.log(`   ⚠️  Mitra not found: "${mitra1Name}" for customer ${name}`);
    }
    if (mitra2Name && !backupMitraId) {
      console.log(`   ⚠️  Backup mitra not found: "${mitra2Name}" for customer ${name}`);
    }

    const customerData: any = {
      customerName: name,
      contact: contact,
      address: row['Address']?.trim() ?? '',
      city: row['City']?.trim() ?? '',
      district: row['District']?.trim() || null,
      village: row['Village']?.trim() || null,
      postalCode: row['Postal Code']?.trim() || null,
      residentialType: row['Residential Type']?.trim() || 'House',
      subscriptionPackage: 'Trial',
      subscriptionStart: firstTrialDate,
      subscriptionEnd: secondTrialDate,
      subscriptionStatus: subscriptionStatus,
      assignedMitraId: assignedMitraId,
      ...(backupMitraIds.length > 0 ? { backupMitraIds } : {}),
      monthlyFee: '0',
      totalPaid: '0',
      outstandingBalance: '0',
      customerNotes: `Trial customer - ${row['Acquisition']?.trim() ?? 'HOMA'} acquisition`,
      isActive: true,
      isDeleted: false,
    };

    try {
      await db.insert(customerDB).values(customerData);
      console.log(`   ✅ Inserted: ${name} (First Trial: ${firstTrialDate ?? '-'}, Status: ${subscriptionStatus})`);
      existingSet.add(key);
      inserted++;
    } catch (err: any) {
      console.error(`   ❌ Error inserting ${name}: ${err.message}`);
      errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`✅ Done!`);
  console.log(`   Inserted : ${inserted}`);
  console.log(`   Skipped  : ${skipped}`);
  console.log(`   Errors   : ${errors}`);
  console.log('='.repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
