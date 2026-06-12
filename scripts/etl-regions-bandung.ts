import { config } from 'dotenv';
config({ path: '.env.local', override: false });
config({ path: '.env', override: false });

import * as fs from 'fs';
import { db } from '../src/lib/db';
import { regionDB } from '../src/lib/schema';
import { and, eq, sql } from 'drizzle-orm';

const REGION_CSV = 'tools/test-data/production-seed/phase2/region-bandung.csv';

async function main() {
  const content = fs.readFileSync(REGION_CSV, 'utf-8');
  const lines = content.split('\n').filter(l => l.trim());
  const [headerLine, ...dataLines] = lines;
  const headers = headerLine.split(',').map(h => h.trim());

  // province,city,district,village,postal_code
  const idxProvince = headers.indexOf('province');
  const idxCity = headers.indexOf('city');
  const idxDistrict = headers.indexOf('district');
  const idxVillage = headers.indexOf('village');
  const idxPostal = headers.indexOf('postal_code');

  const rows = dataLines.map(line => {
    const cols = line.split(',');
    return {
      province: cols[idxProvince]?.trim() ?? '',
      city: cols[idxCity]?.trim() ?? '',
      district: cols[idxDistrict]?.trim() ?? '',
      village: cols[idxVillage]?.trim() ?? '',
      postalCode: cols[idxPostal]?.trim() ?? '',
    };
  }).filter(r => r.city && r.district && r.postalCode);

  console.log(`Parsed ${rows.length} rows from CSV`);

  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    // region_name = "{district}, {city}" — unique human-readable label
    const regionName = `${row.village ? row.village + ', ' : ''}${row.district}, ${row.city}`;

    // Skip if exact province+city+district+village combination already exists
    const existing = await db
      .select({ id: regionDB.id })
      .from(regionDB)
      .where(
        and(
          eq(regionDB.province, row.province),
          eq(regionDB.city, row.city),
          eq(regionDB.district, row.district),
          row.village
            ? eq(regionDB.village, row.village)
            : sql`${regionDB.village} IS NULL OR ${regionDB.village} = ''`
        )
      )
      .limit(1);

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    await db.insert(regionDB).values({
      regionName,
      province: row.province,
      city: row.city,
      district: row.district,
      village: row.village || undefined,
      postalCode: row.postalCode,
      isActive: true,
      isDeleted: false,
    });
    inserted++;
  }

  console.log(`Done. Inserted: ${inserted}, Skipped (already exist): ${skipped}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
