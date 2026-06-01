import { config } from 'dotenv';
config({ path: '.env.local', override: false });

import { db } from '../src/lib/db';
import { subscriptionPackageDB } from '../src/lib/schema';

const PACKAGES = [
  {
    subscriptionPackage: 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)',
    pricePerQty: 'IDR 562,500',
    priceNumeric: '562500',
    visitsPerWeek: 1,
    isActive: false, // DEACTIVATED / NO LONGER USED
  },
  {
    subscriptionPackage: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
    pricePerQty: 'IDR 600,000',
    priceNumeric: '600000',
    visitsPerWeek: 1,
    isActive: true,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
    pricePerQty: 'IDR 1,125,000',
    priceNumeric: '1125000',
    visitsPerWeek: 2,
    isActive: true,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
    pricePerQty: 'IDR 1,650,000',
    priceNumeric: '1650000',
    visitsPerWeek: 3,
    isActive: true,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Regular + Frequent Cleaning (3 hours per visit; 5 visits per week)',
    pricePerQty: 'IDR 2,775,000',
    priceNumeric: '2775000',
    visitsPerWeek: 5,
    isActive: true,
  },
];

async function main() {
  console.log('=== ETL: Packages (Production) ===\n');

  const existing = await db.select().from(subscriptionPackageDB);
  const existingNames = new Set(existing.map(p => p.subscriptionPackage));
  console.log(`Existing packages in DB: ${existing.length}\n`);

  let inserted = 0;
  let skipped = 0;

  for (const pkg of PACKAGES) {
    if (existingNames.has(pkg.subscriptionPackage)) {
      console.log(`  SKIP (exists): ${pkg.subscriptionPackage.substring(0, 60)}...`);
      skipped++;
      continue;
    }

    await db.insert(subscriptionPackageDB).values(pkg);
    console.log(`  INSERTED [${pkg.isActive ? 'ACTIVE' : 'INACTIVE'}]: ${pkg.subscriptionPackage.substring(0, 60)}...`);
    inserted++;
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Skipped: ${skipped}`);

  const final = await db.select().from(subscriptionPackageDB);
  console.log(`\nTotal packages in DB: ${final.length}`);
  final.forEach(p => console.log(`  [${p.isActive ? 'ACTIVE' : 'INACTIVE'}] ${p.subscriptionPackage} — ${p.pricePerQty}`));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
