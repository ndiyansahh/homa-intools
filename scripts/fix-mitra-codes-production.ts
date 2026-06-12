import { config } from 'dotenv';
config({ path: '.env.local', override: false });
config({ path: '.env', override: false });

import { eq } from 'drizzle-orm';
import { db } from '../src/lib/db';
import { mitraDB } from '../src/lib/schema';

// Mapping: NIK → correct mitra code from mitra-db-production.csv
const FIXES = [
  { nik: '3174074411700006', correctCode: 'MITRA-202604-000128', name: 'Emi Pujiyati' },
  { nik: '3175095407880003', correctCode: 'MITRA-202605-000130', name: 'Rachma Kunana' },
  { nik: '3301104907960003', correctCode: 'MITRA-202605-000131', name: 'Watimah' },
  { nik: '3275015207830051', correctCode: 'MITRA-202605-000132', name: 'Julia Fitriana Situmeang' },
  { nik: '3173085607760006', correctCode: 'MITRA-202605-000133', name: 'Yulianti' },
];

async function main() {
  console.log('=== Fix Mitra Codes (align with mitra-db-production.csv) ===\n');

  for (const fix of FIXES) {
    const found = await db
      .select({ id: mitraDB.id, mitraCode: mitraDB.mitraCode, mitraName: mitraDB.mitraName })
      .from(mitraDB)
      .where(eq(mitraDB.mitraNIK, fix.nik));

    if (found.length === 0) {
      console.log(`  NOT FOUND (NIK ${fix.nik}): ${fix.name}`);
      continue;
    }

    const mitra = found[0];
    if (mitra.mitraCode === fix.correctCode) {
      console.log(`  SKIP (already correct): ${fix.name} [${mitra.mitraCode}]`);
      continue;
    }

    await db
      .update(mitraDB)
      .set({ mitraCode: fix.correctCode })
      .where(eq(mitraDB.id, mitra.id));

    console.log(`  UPDATED: ${fix.name}`);
    console.log(`    ${mitra.mitraCode} → ${fix.correctCode}`);
  }

  console.log('\n=== Done ===');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
