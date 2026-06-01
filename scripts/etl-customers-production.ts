import { config } from 'dotenv';
config({ path: '.env.local' });

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/db';
import { customerDB, subscriptionPackageDB } from '../src/lib/schema';

const INVOICE_CSV     = 'tools/test-data/production-seed/invoice-q1-2026.csv';
const CUSTOMER_DB_CSV = 'tools/test-data/production-seed/customer-db.csv';

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
  const parts = s.trim().split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!MONTHS[m]) return null;
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Package name mapping: full invoice name → subscriptionPackageDB key
// ---------------------------------------------------------------------------
const PKG_NAME_MAP: Record<string, string> = {
  'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)':           'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
  'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)':        'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
  'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)':       'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
  'Monthly Subscription of Regular + Frequent Cleaning (3 hours per visit; 5 visits per week)': 'Monthly Subscription of Regular + Frequent Cleaning (3 hours per visit; 5 visits per week)',
};

const getAcquisition = (name: string): string =>
  name.toLowerCase().includes('altrix') ? 'Altrix' : 'HOMA';

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ETL: Customers Production (from invoice CSV) ===\n');

  // Load invoice CSV — primary source
  const invoiceContent = fs.readFileSync(path.join(__dirname, '..', INVOICE_CSV), 'utf-8');
  const invoiceRows = parseCSV(invoiceContent);
  console.log(`Loaded ${invoiceRows.length} invoice rows\n`);

  // Load customer-db.csv — enrichment source
  const custDbContent = fs.readFileSync(path.join(__dirname, '..', CUSTOMER_DB_CSV), 'utf-8');
  const custDbRows = parseCSV(custDbContent);
  // Build enrichment map: customer_name → row
  const enrichMap = new Map<string, Record<string, string>>();
  for (const r of custDbRows) {
    const name = r['customer_name']?.trim();
    if (name && !enrichMap.has(name)) enrichMap.set(name, r);
  }
  console.log(`Loaded ${custDbRows.length} rows from customer-db.csv (${enrichMap.size} unique names)\n`);

  // De-duplicate invoice rows: one customer = earliest Start Period
  // Skip CANCELLED-only customers (Karin has only a cancelled invoice)
  const seen = new Map<string, Record<string, string>>();
  for (const row of invoiceRows) {
    const name = row['Client Name']?.trim();
    if (!name) continue;
    if (!seen.has(name)) {
      seen.set(name, row);
    } else {
      // Keep earliest start period
      const existing = seen.get(name)!;
      const existStart = parseDate(existing['Start Period'] ?? '');
      const newStart   = parseDate(row['Start Period'] ?? '');
      if (existStart && newStart && newStart < existStart) seen.set(name, row);
    }
  }
  const uniqueCustomers = Array.from(seen.values());
  console.log(`Unique customers in invoice CSV: ${uniqueCustomers.length}\n`);

  // Load packages from DB
  const packages = await db.select().from(subscriptionPackageDB);
  const pkgMap = new Map(packages.map(p => [p.subscriptionPackage, p]));

  // Load existing customers from DB
  const existing = await db.select({ id: customerDB.id, customerName: customerDB.customerName }).from(customerDB);
  const existingNames = new Set(existing.map(e => e.customerName));
  console.log(`Existing customers in DB: ${existing.length}\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of uniqueCustomers) {
    const name    = row['Client Name']?.trim();
    const rawPkg  = row['Type of Subscription']?.trim();
    const rawStart = row['Start Period']?.trim();
    const rawAddr = row['Address']?.replace(/\n|\r/g, ' ').trim();
    const rawPhone = row['Phone Num']?.trim();
    const rawQty  = parseInt(row['Qty'] ?? '1', 10) || 1;

    if (!name) continue;

    if (existingNames.has(name)) {
      console.log(`  SKIP (exists): ${name}`);
      skipped++;
      continue;
    }

    const subscriptionStart = rawStart ? parseDate(rawStart) : null;
    if (!subscriptionStart) {
      console.log(`  ERROR (bad start_date): "${rawStart}" — ${name}`);
      errors++;
      continue;
    }

    const pkgFullName = PKG_NAME_MAP[rawPkg ?? ''];
    if (!pkgFullName) {
      console.log(`  ERROR (unknown package "${rawPkg}"): ${name}`);
      errors++;
      continue;
    }

    const pkg = pkgMap.get(pkgFullName);
    if (!pkg) {
      console.log(`  ERROR (package not in DB "${pkgFullName}"): ${name}`);
      errors++;
      continue;
    }

    // Enrich from customer-db.csv
    const enrich = enrichMap.get(name);
    const contact      = rawPhone || enrich?.['contact'] || '-';
    const address      = rawAddr  || enrich?.['address']  || '-';
    const city         = enrich?.['city']             || null;
    const village      = enrich?.['village']          || null;
    const district     = enrich?.['district']         || null;
    const postalCode   = enrich?.['postal_code']      || null;
    const residentialType = enrich?.['residential_type'] || null;
    const acquisition  = getAcquisition(name);

    await db.insert(customerDB).values({
      customerName:        name,
      contact:             contact.substring(0, 20),
      address,
      village,
      district,
      city,
      postalCode,
      residentialType,
      subscriptionPackageId: pkg.id,
      subscriptionPackage:   pkg.subscriptionPackage,
      subscriptionStart,
      subscriptionStatus:  'Active',
      qtyPackage:          rawQty,
      monthlyFee:          pkg.priceNumeric,
      isActive:            true,
      isDeleted:           false,
      customerNotes:       acquisition !== 'HOMA' ? `Acquisition: ${acquisition}` : null,
    });

    console.log(`  INSERTED: ${name} [${pkg.visitsPerWeek}x/week] start: ${subscriptionStart}${enrich ? ' +enrich' : ''}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);

  const final = await db.select({ id: customerDB.id }).from(customerDB);
  console.log(`Total customers in DB: ${final.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
