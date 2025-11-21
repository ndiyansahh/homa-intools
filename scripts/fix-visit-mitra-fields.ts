import { db } from '../src/lib/db';
import { visitDB } from '../src/lib/schema';
import { sql, isNull, or } from 'drizzle-orm';

/**
 * Fix existing visits that don't have originalMitraId and actualMitraId populated
 * Copy from mitraId to both fields
 */
async function fixVisitMitraFields() {
  try {
    console.log('🔍 Checking for visits with NULL originalMitraId or actualMitraId...');

    // Find visits where originalMitraId or actualMitraId is NULL but mitraId is not NULL
    const visitsToFix = await db
      .select({
        id: visitDB.id,
        mitraId: visitDB.mitraId,
        originalMitraId: visitDB.originalMitraId,
        actualMitraId: visitDB.actualMitraId,
        visitNumber: visitDB.visitNumber,
      })
      .from(visitDB)
      .where(
        or(
          isNull(visitDB.originalMitraId),
          isNull(visitDB.actualMitraId)
        )
      );

    console.log(`📊 Found ${visitsToFix.length} visits to fix`);

    if (visitsToFix.length === 0) {
      console.log('✅ All visits already have mitra fields populated!');
      return;
    }

    // Update each visit
    let fixed = 0;
    for (const visit of visitsToFix) {
      if (!visit.mitraId) {
        console.log(`⚠️  Visit ${visit.id} has no mitraId, skipping...`);
        continue;
      }

      await db
        .update(visitDB)
        .set({
          originalMitraId: visit.originalMitraId || visit.mitraId,
          actualMitraId: visit.actualMitraId || visit.mitraId,
          updatedAt: new Date(),
        })
        .where(sql`${visitDB.id} = ${visit.id}`);

      fixed++;
      console.log(`✓ Fixed visit #${visit.visitNumber} (${visit.id})`);
    }

    console.log(`\n✅ Successfully fixed ${fixed} visits!`);

    // Verification
    const remainingIssues = await db
      .select({
        count: sql<number>`count(*)`,
      })
      .from(visitDB)
      .where(
        or(
          isNull(visitDB.originalMitraId),
          isNull(visitDB.actualMitraId)
        )
      );

    console.log(`📊 Remaining visits with NULL fields: ${remainingIssues[0]?.count || 0}`);

  } catch (error) {
    console.error('❌ Error fixing visit mitra fields:', error);
    process.exit(1);
  }
}

// Run the fix
fixVisitMitraFields()
  .then(() => {
    console.log('\n🎉 Migration completed!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
