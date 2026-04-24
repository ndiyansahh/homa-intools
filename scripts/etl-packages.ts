import { config } from 'dotenv';
config({ path: '.env.local' });

import { db } from '../src/lib/db';
import { subscriptionPackageDB } from '../src/lib/schema';
import { eq } from 'drizzle-orm';

const PACKAGES_FROM_GSHEET = [
  {
    subscriptionPackage: 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)',
    frequency: '1x/Week',
    pricePerQty: 'IDR 562,500',
    priceNumeric: '562500',
    visitsPerWeek: 1,
    isActive: false,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
    frequency: '1x/Week',
    pricePerQty: 'IDR 600,000',
    priceNumeric: '600000',
    visitsPerWeek: 1,
    isActive: true,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
    frequency: '2x/Week',
    pricePerQty: 'IDR 1,125,000',
    priceNumeric: '1125000',
    visitsPerWeek: 2,
    isActive: true,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
    frequency: '3x/Week',
    pricePerQty: 'IDR 1,650,000',
    priceNumeric: '1650000',
    visitsPerWeek: 3,
    isActive: true,
  },
  {
    subscriptionPackage: 'Monthly Subscription of Regular + Frequent Cleaning (3 hours per visit; 5 visits per week)',
    frequency: '5x/Week',
    pricePerQty: 'IDR 2,775,000',
    priceNumeric: '2775000',
    visitsPerWeek: 5,
    isActive: true,
  },
];

async function main() {
  console.log('=== ETL: Packages ===\n');

  const existing = await db.select().from(subscriptionPackageDB);
  console.log(`Existing packages in DB: ${existing.length}`);
  existing.forEach(p => console.log(`  - [${p.isActive ? 'ACTIVE' : 'INACTIVE'}] ${p.subscriptionPackage} → ${p.priceNumeric}`));

  console.log('\nProcessing GSheet packages...\n');

  let inserted = 0;
  let skipped = 0;
  let updated = 0;

  for (const pkg of PACKAGES_FROM_GSHEET) {
    const match = existing.find(e => e.subscriptionPackage === pkg.subscriptionPackage);

    if (match) {
      // Check if anything changed
      if (match.priceNumeric !== pkg.priceNumeric || match.isActive !== pkg.isActive) {
        await db.update(subscriptionPackageDB)
          .set({ priceNumeric: pkg.priceNumeric, isActive: pkg.isActive })
          .where(eq(subscriptionPackageDB.id, match.id));
        console.log(`  UPDATED: ${pkg.subscriptionPackage}`);
        updated++;
      } else {
        console.log(`  SKIP (no change): ${pkg.subscriptionPackage}`);
        skipped++;
      }
    } else {
      await db.insert(subscriptionPackageDB).values({
        subscriptionPackage: pkg.subscriptionPackage,
        pricePerQty: pkg.pricePerQty,
        priceNumeric: pkg.priceNumeric,
        visitsPerWeek: pkg.visitsPerWeek,
        isActive: pkg.isActive,
      });
      console.log(`  INSERTED: ${pkg.subscriptionPackage}`);
      inserted++;
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Inserted: ${inserted}, Updated: ${updated}, Skipped: ${skipped}`);

  const final = await db.select().from(subscriptionPackageDB);
  console.log(`\nFinal packages in DB: ${final.length}`);
  final.forEach(p => console.log(`  [${p.id}] [${p.isActive ? 'ACTIVE' : 'INACTIVE'}] ${p.subscriptionPackage} → ${p.priceNumeric}`));

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
