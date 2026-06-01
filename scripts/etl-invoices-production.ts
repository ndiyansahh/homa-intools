import { config } from 'dotenv';
config({ path: '.env.local', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { db } from '../src/lib/db';
import { customerDB, subscriptionPackageDB, invoiceDB } from '../src/lib/schema';

const INVOICE_CSV = 'tools/test-data/production-seed/invoice-q1-2026.csv';

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
  const parts = s.trim().split('-');
  if (parts.length !== 3) return null;
  const [d, m, y] = parts;
  if (!MONTHS[m]) return null;
  return `${y}-${MONTHS[m]}-${d.padStart(2, '0')}`;
};

const parseAmount = (s: string): string => s.replace(/[^0-9]/g, '') || '0';

// Status mapping: CSV → DB enum
const mapStatus = (s: string): string => {
  if (s === 'PAID')      return 'Paid';
  if (s === 'CANCELLED') return 'Cancelled';
  return 'Open';
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ETL: Invoices Production (from CSV) ===\n');

  const csvContent = fs.readFileSync(path.join(__dirname, '..', INVOICE_CSV), 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Loaded ${rows.length} invoice rows\n`);

  // Load customer map
  const customers = await db.select({ id: customerDB.id, name: customerDB.customerName }).from(customerDB);
  const custMap = new Map(customers.map(c => [c.name, c.id]));
  console.log(`Customers in DB: ${customers.length}`);

  // Load package map
  const packages = await db.select().from(subscriptionPackageDB);
  const pkgMap = new Map(packages.map(p => [p.subscriptionPackage, p]));

  // Load existing invoices
  const existingInvoices = await db.select({ invoiceNumber: invoiceDB.invoiceNumber }).from(invoiceDB);
  const existingNums = new Set(existingInvoices.map(i => i.invoiceNumber));
  console.log(`Existing invoices in DB: ${existingInvoices.length}\n`);

  let inserted = 0;
  let skipped = 0;
  let errors = 0;

  for (const row of rows) {
    // Header first column has trailing spaces — already trimmed by parseCSV
    const invoiceNumber = row['Invoce No.']?.trim();
    const invoiceNo     = parseInt(row['No'] ?? '0', 10);
    const clientName    = row['Client Name']?.trim();
    const rawAddress    = row['Address']?.replace(/\n|\r/g, ' ').trim();
    const rawPhone      = row['Phone Num']?.trim();
    const rawPkg        = row['Type of Subscription']?.trim();
    const qty           = parseInt(row['Qty'] ?? '1', 10) || 1;
    const rawPrice      = row['Price per Qty']?.trim();
    const rawPromoCode  = row['Promo Code']?.trim();
    const rawPromoDis   = row['Promo Discount']?.trim();
    const rawStartDate  = row['Start Period']?.trim();
    const rawEndDate    = row['End Period']?.trim();
    const rawStatus     = row['Status']?.trim();
    const rawPaidDate   = row['Payment Date']?.trim();
    const rawYYYY       = parseInt(row['YYYY'] ?? '0', 10);
    const rawMM         = parseInt(row['MM'] ?? '0', 10);
    const rawDD         = parseInt(row['DD'] ?? '0', 10);

    if (!invoiceNumber || !clientName) continue;

    if (existingNums.has(invoiceNumber)) {
      console.log(`  SKIP (exists): ${invoiceNumber}`);
      skipped++;
      continue;
    }

    const customerId = custMap.get(clientName);
    if (!customerId) {
      console.log(`  ERROR (customer not found): "${clientName}" — ${invoiceNumber}`);
      errors++;
      continue;
    }

    const pkg = pkgMap.get(rawPkg ?? '');
    if (!pkg) {
      console.log(`  ERROR (package not found): "${rawPkg}" — ${invoiceNumber}`);
      errors++;
      continue;
    }

    const invoiceStartDate = rawStartDate ? parseDate(rawStartDate) : null;
    if (!invoiceStartDate) {
      console.log(`  ERROR (bad start_date): "${rawStartDate}" — ${invoiceNumber}`);
      errors++;
      continue;
    }

    const invoiceEndDate  = rawEndDate ? parseDate(rawEndDate) : null;
    const priceNum        = parseAmount(rawPrice ?? '');
    const promoDiscount   = parseAmount(rawPromoDis ?? '');
    const totalAmount     = (parseInt(priceNum) * qty - parseInt(promoDiscount)).toString();
    const status          = mapStatus(rawStatus ?? '');
    const paidAt          = rawPaidDate ? parseDate(rawPaidDate) : null;

    await db.insert(invoiceDB).values({
      customerId,
      invoiceNumber,
      invoiceNo,
      invoiceStartDate,
      invoiceEndDate:       invoiceEndDate ?? undefined,
      invoiceYears:         rawYYYY || new Date(invoiceStartDate).getFullYear(),
      invoiceMonths:        rawMM   || new Date(invoiceStartDate).getMonth() + 1,
      invoiceDays:          rawDD   || new Date(invoiceStartDate).getDate(),
      invoiceSubscription:  'Cleaning',
      invoiceCustomerName:  clientName,
      invoiceAddress:       rawAddress || '-',
      invoicePhoneNumber:   (rawPhone ?? '-').substring(0, 20),
      invoiceQty:           qty,
      invoicePricePerQty:   priceNum,
      invoicePromoCode:     rawPromoCode || null,
      invoicePromoDiscount: promoDiscount,
      subtotal:             priceNum,
      tax:                  '0',
      discount:             promoDiscount,
      totalAmount,
      status,
      paidAt:               paidAt ? new Date(paidAt) : null,
      isDeleted:            false,
    });

    console.log(`  INSERTED: ${invoiceNumber} [${clientName}] ${status}${paidAt ? ` paid:${paidAt}` : ''}`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}, Errors: ${errors}`);

  const final = await db.select({ id: invoiceDB.id }).from(invoiceDB);
  console.log(`Total invoices in DB: ${final.length}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
