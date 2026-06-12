/**
 * fix-mitra-rates.ts
 *
 * Upsert rate configs for ALL mitras from mitra-db-production.csv.
 * For each mitra found in DB:
 *   - Delete existing rate rows (if any)
 *   - Re-insert 7 rows from CSV
 *
 * Safe to run multiple times (idempotent).
 * Run: npx tsx scripts/fix-mitra-rates.ts
 */

import { config } from 'dotenv';
config({ path: '.env.local', override: false });
config({ path: '.env', override: false });

import * as fs from 'fs';
import * as path from 'path';
import { eq, and } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { mitraDB, mitraRateConfigDB } from '../src/lib/schema';

const MITRA_DB_CSV = 'tools/test-data/production-seed/mitra-db-production.csv';

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

const parseRate = (s: string): string => s.replace(/[^0-9]/g, '') || '0';

async function main() {
  console.log('=== Fix Mitra Rates: Upsert from CSV ===\n');

  const csvContent = fs.readFileSync(path.join(__dirname, '..', MITRA_DB_CSV), 'utf-8');
  const csvRows = parseCSV(csvContent);
  console.log(`Loaded ${csvRows.length} rows from CSV\n`);

  const existingMitras = await db
    .select({ id: mitraDB.id, mitraCode: mitraDB.mitraCode, mitraName: mitraDB.mitraName })
    .from(mitraDB);
  const mitraMap = new Map(existingMitras.map(m => [m.mitraCode, m]));
  console.log(`Mitras in DB: ${existingMitras.length}\n`);

  let updated = 0;
  let notFound = 0;

  for (const r of csvRows) {
    const code = r['Mitra Code'].trim();
    if (!code) continue;

    const mitra = mitraMap.get(code);
    if (!mitra) {
      console.log(`  NOT IN DB: ${r['Name'].trim()} [${code}]`);
      notFound++;
      continue;
    }

    const rates = [
      r['Rate_1x/week'], r['Rate_2x/week'], r['Rate_3x/week'], r['Rate_4x/week'],
      r['Rate_5x/week'], r['Rate_6x/week'], r['Rate_7x/week'],
    ];

    // Delete existing rates for this mitra, then re-insert
    await db.delete(mitraRateConfigDB).where(eq(mitraRateConfigDB.mitraId, mitra.id));

    for (let i = 0; i < rates.length; i++) {
      await db.insert(mitraRateConfigDB).values({
        mitraId: mitra.id,
        visitsPerWeek: i + 1,
        payoutRate: parseRate(rates[i]),
      });
    }

    console.log(`  UPDATED: ${mitra.mitraName} [${code}] rates: ${rates.map(parseRate).join(', ')}`);
    updated++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Updated: ${updated}, Not found in DB: ${notFound}`);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
