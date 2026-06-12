import { config } from 'dotenv';
config({ path: '.env.local', override: false });
config({ path: '.env', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/db';
import { customerDB, mitraDB, invoiceDB, visitDB } from '../src/lib/schema';

const ATTENDANCE_CSV = 'tools/test-data/production-seed/phase2/attendanced-phase-2.csv';

// ---------------------------------------------------------------------------
// CSV parser — handles multi-line quoted fields (address column spans lines)
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

const toISO = (s: string): string | null => {
  const dateStr = s.trim().replace(/^[A-Za-z]{3},/, '').trim();
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!MONTHS[m]) return null;
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
};

const DAY_NAMES: Record<number, string> = {
  0: 'Sunday', 1: 'Monday', 2: 'Tuesday', 3: 'Wednesday',
  4: 'Thursday', 5: 'Friday', 6: 'Saturday',
};

const getDayName = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return DAY_NAMES[d.getDay()];
};

// ---------------------------------------------------------------------------
// Cancel keyword detection
// ---------------------------------------------------------------------------
const CANCEL_KEYWORDS = ['OFF', 'SAKIT', 'IZIN', 'MANGKIR', 'BANJIR', 'LIBUR', 'CUSTOMER'];

const parseEntry = (raw: string): { date: string; cancelled: boolean; reason: string | null } | null => {
  if (!raw?.trim()) return null;
  const clean = raw.replace(/\n|\r/g, ' ').trim();
  const isCancelled = CANCEL_KEYWORDS.some(k => clean.toUpperCase().includes(k));

  if (isCancelled) {
    const dateMatch = clean.match(/(\d{1,2}-[A-Za-z]+-\d{4})/);
    if (!dateMatch) return null;
    const date = toISO(dateMatch[1]);
    if (!date) return null;
    const reasonRaw = clean.replace(dateMatch[1], '').replace(/[,\s]+/g, ' ').trim();
    return { date, cancelled: true, reason: reasonRaw || null };
  }

  const date = toISO(clean);
  if (!date) return null;
  return { date, cancelled: false, reason: null };
};

// ---------------------------------------------------------------------------
// Extract mitra code from "Nama Mitra (MITRA-xxx)" format
// Normalizes typo: MITRA-2020501-xxx → MITRA-202501-xxx
// ---------------------------------------------------------------------------
const normalizeMitraCode = (code: string): string =>
  code.replace(/MITRA-202(0)(\d{3})-/, 'MITRA-202$2-');

const parseMitraCode = (raw: string): string | null => {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/\(([^)]+)\)/);
  return match ? normalizeMitraCode(match[1].trim()) : null;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ETL: Visits Phase 2 (from CSV) ===\n');

  const csvPath = path.join(__dirname, '..', ATTENDANCE_CSV);
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const records = parseCSV(csvContent);
  console.log(`Loaded ${records.length} rows from ${ATTENDANCE_CSV}\n`);

  // Build lookup maps
  const customers = await db.select({ id: customerDB.id, name: customerDB.customerName }).from(customerDB);
  const custMap = new Map(customers.map(c => [c.name, c.id]));

  const mitras = await db.select({ id: mitraDB.id, code: mitraDB.mitraCode }).from(mitraDB);
  const mitraMap = new Map(mitras.map(m => [m.code, m.id]));

  const invoices = await db.select({ id: invoiceDB.id, invoiceNumber: invoiceDB.invoiceNumber }).from(invoiceDB);
  const invoiceMap = new Map(invoices.map(i => [i.invoiceNumber, i.id]));

  const existingVisits = await db.select({ invoiceId: visitDB.invoiceId }).from(visitDB);
  const invoicesWithVisits = new Set(existingVisits.map(v => v.invoiceId).filter(Boolean));

  console.log(`Customers in DB: ${customers.length}`);
  console.log(`Mitras in DB: ${mitras.length}`);
  console.log(`Invoices in DB: ${invoices.length}`);
  console.log(`Invoices already with visits: ${invoicesWithVisits.size}\n`);

  let totalInserted = 0;
  let totalSkipped = 0;
  let skippedNoInvoice = 0;
  let skippedNoCustomer = 0;
  let skippedNoMitra = 0;
  let errors = 0;

  for (const row of records) {
    const invoiceNumber = row['invoice_number']?.trim();
    const clientName = row['client_name']?.trim();
    const mitraRaw = row['mitra_1']?.trim();

    if (!invoiceNumber || !clientName || !mitraRaw) continue;

    const mitraCode = parseMitraCode(mitraRaw);
    if (!mitraCode) {
      console.log(`  ERROR (can't parse mitra code): "${mitraRaw}" — ${invoiceNumber}`);
      errors++;
      continue;
    }

    const invoiceId = invoiceMap.get(invoiceNumber);
    if (!invoiceId) {
      // Invoice not in DB yet — skip silently (will be seeded when invoices ETL runs)
      skippedNoInvoice++;
      continue;
    }

    if (invoicesWithVisits.has(invoiceId)) {
      console.log(`  SKIP (visits exist): ${invoiceNumber}`);
      totalSkipped++;
      continue;
    }

    const customerId = custMap.get(clientName);
    if (!customerId) {
      console.log(`  SKIP (customer not found): "${clientName}" — ${invoiceNumber}`);
      skippedNoCustomer++;
      continue;
    }

    const mitraId = mitraMap.get(mitraCode);
    if (!mitraId) {
      console.log(`  SKIP (mitra not found): ${mitraCode} — ${invoiceNumber}`);
      skippedNoMitra++;
      continue;
    }

    // Collect visit_1..visit_31
    const visitEntries: string[] = [];
    for (let i = 1; i <= 31; i++) {
      const v = row[`visit_${i}`];
      if (v?.trim()) visitEntries.push(v.trim());
    }

    // Collect backup_mitra_1..backup_mitra_31 (aligned by index with visitEntries)
    const backupEntries: string[] = [];
    for (let i = 1; i <= 31; i++) {
      backupEntries.push(row[`backup_mitra_${i}`]?.trim() ?? '');
    }

    let visitNumber = 1;
    let inserted = 0;

    for (let i = 0; i < visitEntries.length; i++) {
      const parsed = parseEntry(visitEntries[i]);
      if (!parsed) continue;

      const backupCode = parseMitraCode(backupEntries[i] ?? '');
      const effectiveMitraId = backupCode ? (mitraMap.get(backupCode) ?? mitraId) : mitraId;

      if (backupCode && !mitraMap.get(backupCode)) {
        console.log(`  WARN: backup mitra not found [${backupCode}] for ${invoiceNumber} visit ${i + 1} — using mitra_1`);
      }

      try {
        await db.insert(visitDB).values({
          customerId,
          invoiceId,
          mitraId: effectiveMitraId,
          originalMitraId: mitraId,
          actualMitraId: effectiveMitraId,
          visitNumber,
          scheduledDate: parsed.date,
          scheduledDay: getDayName(parsed.date),
          status: parsed.cancelled ? 'Cancelled' : 'Done',
          durationHours: 3,
          visitNotes: parsed.reason,
        });
        visitNumber++;
        inserted++;
      } catch (err: any) {
        console.log(`  ERROR inserting visit ${visitNumber} for ${invoiceNumber}: ${err.message}`);
        errors++;
      }
    }

    if (inserted > 0) {
      console.log(`  INSERTED: ${invoiceNumber} [${clientName}] — ${inserted} visits`);
      totalInserted += inserted;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Visits inserted:               ${totalInserted}`);
  console.log(`Invoices skipped (has visits): ${totalSkipped}`);
  console.log(`Skipped (invoice not in DB):   ${skippedNoInvoice}`);
  console.log(`Skipped (customer not in DB):  ${skippedNoCustomer}`);
  console.log(`Skipped (mitra not in DB):     ${skippedNoMitra}`);
  console.log(`Errors:                        ${errors}`);

  const finalCount = await db.select({ id: visitDB.id }).from(visitDB);
  console.log(`\nTotal visits in DB: ${finalCount.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
