import { config } from 'dotenv';
config({ path: '.env.local', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { customerDB, mitraDB } from '../src/lib/schema';

const ATTENDANCE_CSV = 'tools/test-data/production-seed/attendance-q1-2026.csv';

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

const parseMitraCode = (raw: string): string | null => {
  if (!raw?.trim()) return null;
  const match = raw.trim().match(/\(([^)]+)\)/);
  return match ? normalizeMitraCode(match[1].trim()) : null;
};

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('=== ETL: Backfill Customer Mitra Assignment (from attendance CSV) ===\n');

  const csvContent = fs.readFileSync(path.join(__dirname, '..', ATTENDANCE_CSV), 'utf-8');
  const rows = parseCSV(csvContent);
  console.log(`Loaded ${rows.length} attendance rows\n`);

  // Build per-customer mitra data:
  // primaryMitra = mitra_1 from the LATEST invoice (highest invoice_number)
  // backupMitras = all unique backup mitra codes across all invoices
  const customerPrimary = new Map<string, string>();   // clientName → primaryMitraCode
  const customerBackups = new Map<string, Set<string>>(); // clientName → set of backup codes

  for (const row of rows) {
    const clientName = row['client_name']?.trim();
    if (!clientName) continue;

    const primaryCode = parseMitraCode(row['mitra_1'] ?? '');
    if (primaryCode) {
      // Last row wins for primary (CSV is ordered by invoice date)
      customerPrimary.set(clientName, primaryCode);
    }

    // Collect all unique backup mitra codes
    if (!customerBackups.has(clientName)) customerBackups.set(clientName, new Set());
    const backups = customerBackups.get(clientName)!;
    for (let i = 1; i <= 31; i++) {
      const bm = parseMitraCode(row[`backup_mitra_${i}`] ?? '');
      if (bm && bm !== primaryCode) backups.add(bm);
    }
  }

  console.log(`Unique customers with mitra data: ${customerPrimary.size}\n`);

  // Load mitra map: code → id
  const mitras = await db.select({ id: mitraDB.id, code: mitraDB.mitraCode }).from(mitraDB);
  const mitraMap = new Map(mitras.map(m => [m.code, m.id]));

  // Load customers
  const customers = await db.select({ id: customerDB.id, name: customerDB.customerName }).from(customerDB);
  const custMap = new Map(customers.map(c => [c.name, c.id]));

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const [clientName, primaryCode] of customerPrimary) {
    const customerId = custMap.get(clientName);
    if (!customerId) {
      console.log(`  WARN (customer not in DB): ${clientName}`);
      skipped++;
      continue;
    }

    const primaryMitraId = mitraMap.get(primaryCode);
    if (!primaryMitraId) {
      console.log(`  WARN (primary mitra not in DB): ${primaryCode} — ${clientName}`);
      errors++;
      continue;
    }

    // Collect backup mitra IDs
    const backupCodes = [...(customerBackups.get(clientName) ?? [])];
    const backupMitraIds: string[] = [];
    for (const code of backupCodes) {
      const id = mitraMap.get(code);
      if (id) {
        backupMitraIds.push(id);
      } else {
        console.log(`  WARN (backup mitra not in DB): ${code} — ${clientName}`);
      }
    }

    await db.update(customerDB)
      .set({
        assignedMitraId: primaryMitraId,
      })
      .where(eq(customerDB.id, customerId));

    console.log(`  UPDATED: ${clientName} → primary: ${primaryCode}${backupMitraIds.length > 0 ? ` + ${backupMitraIds.length} backup(s)` : ''}`);
    updated++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
