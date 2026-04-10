/**
 * Data Migration Script: Migrate Mitra Rates to New Multi-Rate System
 *
 * Purpose: Copy existing payout rates from mitra_db to mitra_rate_config_db
 *
 * This script:
 * 1. Reads all active mitras from mitra_db
 * 2. For each mitra with a monthly_base_rate OR base_rate:
 *    - Creates a default rate config for 1x/week (most common)
 *    - Uses subscription_type from mitra_db or defaults to "Regular"
 *    - Uses monthly_base_rate (or falls back to base_rate)
 * 3. Logs all migrations for audit trail
 * 4. Can be run multiple times safely (checks for existing rates)
 *
 * Usage:
 *   npm run tsx scripts/migrate-mitra-rates.ts
 *
 * Rollback:
 *   DELETE FROM mitra_rate_config_db; (clears all rate configs)
 */

import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface Mitra {
  id: string;
  mitra_name: string;
  subscription_type: string | null;
  monthly_base_rate: string | null;
  base_rate: string | null;
}

interface MigrationResult {
  mitraId: string;
  mitraName: string;
  subscriptionType: string;
  visitsPerWeek: number;
  payoutRate: string;
  status: 'created' | 'skipped' | 'error';
  message?: string;
}

async function migrateMitraRates() {
  console.log('🚀 Starting mitra rates migration...');
  console.log('📅 Date:', new Date().toISOString());
  console.log('');

  const results: MigrationResult[] = [];

  try {
    const client = await pool.connect();
    console.log('✅ Database connection established');

    try {
      // Step 1: Get all active mitras with rates
      console.log('\n📋 Step 1: Fetching all active mitras...');
      const mitrasResult = await client.query<Mitra>(`
        SELECT
          id,
          mitra_name,
          subscription_type,
          monthly_base_rate,
          base_rate
        FROM mitra_db
        WHERE is_active = true
          AND is_deleted = false
          AND (monthly_base_rate > 0 OR base_rate > 0)
        ORDER BY mitra_name;
      `);

      const mitras = mitrasResult.rows;
      console.log(`   Found ${mitras.length} active mitras with rates`);

      if (mitras.length === 0) {
        console.log('\n⚠️  No mitras found with rates. Nothing to migrate.');
        return results;
      }

      // Step 2: Migrate each mitra's rate
      console.log('\n📦 Step 2: Migrating rates to mitra_rate_config_db...');

      for (const mitra of mitras) {
        const mitraResult: MigrationResult = {
          mitraId: mitra.id,
          mitraName: mitra.mitra_name,
          subscriptionType: mitra.subscription_type || 'Regular',
          visitsPerWeek: 1, // Default to 1x/week
          payoutRate: mitra.monthly_base_rate || mitra.base_rate || '0',
          status: 'error',
        };

        try {
          // Check if rate already exists
          const existingRate = await client.query(`
            SELECT id FROM mitra_rate_config_db
            WHERE mitra_id = $1 AND visits_per_week = $2
          `, [mitra.id, 1]);

          if (existingRate.rows.length > 0) {
            mitraResult.status = 'skipped';
            mitraResult.message = 'Rate already exists';
            results.push(mitraResult);
            console.log(`   ⏭️  ${mitra.mitra_name}: Skipped (rate already exists)`);
            continue;
          }

          // Determine the rate to use (prefer monthly_base_rate)
          const rateToUse = mitra.monthly_base_rate && parseFloat(mitra.monthly_base_rate) > 0
            ? mitra.monthly_base_rate
            : mitra.base_rate;

          if (!rateToUse || parseFloat(rateToUse) === 0) {
            mitraResult.status = 'skipped';
            mitraResult.message = 'No valid rate found';
            results.push(mitraResult);
            console.log(`   ⏭️  ${mitra.mitra_name}: Skipped (no valid rate)`);
            continue;
          }

          mitraResult.payoutRate = rateToUse;

          // Insert rate config
          await client.query(`
            INSERT INTO mitra_rate_config_db (
              mitra_id,
              subscription_type,
              visits_per_week,
              payout_rate,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, NOW(), NOW())
          `, [
            mitra.id,
            mitraResult.subscriptionType,
            1, // Default to 1x/week
            rateToUse
          ]);

          mitraResult.status = 'created';
          mitraResult.message = `Created rate: Rp ${parseFloat(rateToUse).toLocaleString('id-ID')} for 1x/week`;
          results.push(mitraResult);
          console.log(`   ✅ ${mitra.mitra_name}: ${mitraResult.message}`);

        } catch (error) {
          mitraResult.status = 'error';
          mitraResult.message = error instanceof Error ? error.message : 'Unknown error';
          results.push(mitraResult);
          console.error(`   ❌ ${mitra.mitra_name}: Error - ${mitraResult.message}`);
        }
      }

      // Step 3: Summary
      console.log('\n📊 Migration Summary:');
      console.log(`   Total mitras processed: ${results.length}`);
      console.log(`   ✅ Created: ${results.filter(r => r.status === 'created').length}`);
      console.log(`   ⏭️  Skipped: ${results.filter(r => r.status === 'skipped').length}`);
      console.log(`   ❌ Errors: ${results.filter(r => r.status === 'error').length}`);

      // Step 4: Verify migration
      console.log('\n🔍 Step 3: Verifying migration...');
      const verifyResult = await client.query(`
        SELECT
          COUNT(DISTINCT m.id) as total_mitras,
          COUNT(mrc.id) as total_rate_configs
        FROM mitra_db m
        LEFT JOIN mitra_rate_config_db mrc ON m.id = mrc.mitra_id
        WHERE m.is_active = true
          AND m.is_deleted = false
          AND (m.monthly_base_rate > 0 OR m.base_rate > 0);
      `);

      const { total_mitras, total_rate_configs } = verifyResult.rows[0];
      console.log(`   Mitras with rates: ${total_mitras}`);
      console.log(`   Rate configs created: ${total_rate_configs}`);

      if (parseInt(total_rate_configs) >= results.filter(r => r.status === 'created').length) {
        console.log('   ✅ Verification passed!');
      } else {
        console.warn('   ⚠️  Verification warning: Some rates may not have been created');
      }

    } catch (error) {
      console.error('💥 Migration failed:', error);
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }

  console.log('\n✨ Migration completed!');
  console.log('');
  console.log('📝 Next steps:');
  console.log('   1. Review the migration results above');
  console.log('   2. Add additional rates for mitras handling multiple subscription types');
  console.log('   3. Use the Rate Configuration UI to manage rates going forward');
  console.log('');
  console.log('🔄 Rollback procedure (if needed):');
  console.log('   DELETE FROM mitra_rate_config_db;');
  console.log('   Then re-run this script');
  console.log('');

  return results;
}

// Run migration if called directly
if (require.main === module) {
  migrateMitraRates();
}

export { migrateMitraRates };
