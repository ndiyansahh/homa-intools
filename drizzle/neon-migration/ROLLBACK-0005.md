# Rollback Procedure for Migration 0005

**Migration:** 0005_mitra_rate_config_refactor.sql
**Date Created:** 2026-03-10
**Purpose:** Refactor mitra_rate_config_db table for multi-rate system

---

## What This Migration Does

1. **Drops** the old `mitra_rate_config_db` table (from migration 0002)
2. **Creates** new `mitra_rate_config_db` with:
   - `subscription_type` (varchar 50)
   - `visits_per_week` (integer) - KEY FIELD
   - `payout_rate` (decimal 12,2)
   - Unique constraint on `(mitra_id, visits_per_week)`
   - Cascade delete when mitra is deleted
3. **Data Migration**: Copies rates from `mitra_db` using `scripts/migrate-mitra-rates.ts`

---

## When to Rollback

Rollback if:
- Migration fails during execution
- Data migration script fails
- Payout calculations are incorrect after migration
- Rate Configuration UI has bugs and needs schema changes
- Need to revert to old time-based rate system (effectiveFrom/effectiveTo)

---

## Rollback Steps

### Step 1: Backup Current Data (CRITICAL)

```sql
-- Create backup table of new rate configs
CREATE TABLE mitra_rate_config_backup_20260310 AS
SELECT * FROM mitra_rate_config_db;

-- Verify backup
SELECT COUNT(*) FROM mitra_rate_config_backup_20260310;
```

### Step 2: Restore Old Schema (Migration 0002)

```sql
-- Drop new table
DROP TABLE IF EXISTS mitra_rate_config_db CASCADE;

-- Recreate old table structure (from 0002_mitra_rate_config.sql)
CREATE TABLE IF NOT EXISTS "mitra_rate_config_db" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "mitra_id" uuid NOT NULL,
  "subscription_package_id" uuid,
  "monthly_rate" numeric(10, 2) NOT NULL,
  "effective_from" date NOT NULL,
  "effective_to" date,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now(),
  "created_by" varchar(255),
  "is_active" boolean DEFAULT true
);

-- Add foreign keys
ALTER TABLE "mitra_rate_config_db"
  ADD CONSTRAINT "mitra_rate_config_db_mitra_id_mitra_db_id_fk"
  FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id")
  ON DELETE no action ON UPDATE no action;

ALTER TABLE "mitra_rate_config_db"
  ADD CONSTRAINT "mitra_rate_config_db_subscription_package_id_subscription_package_db_id_fk"
  FOREIGN KEY ("subscription_package_id") REFERENCES "public"."subscription_package_db"("id")
  ON DELETE no action ON UPDATE no action;

-- Add indexes
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_mitra_id" ON "mitra_rate_config_db" ("mitra_id");
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_active" ON "mitra_rate_config_db" ("is_active");
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_effective_dates" ON "mitra_rate_config_db" ("effective_from", "effective_to");
```

### Step 3: Restore Old Data (if exists)

```sql
-- If you had data in the old table before migration 0005, restore it here
-- NOTE: Migration 0005 drops the old table, so data is LOST unless backed up before running 0005

-- Example (if you have backup from before 0005):
-- INSERT INTO mitra_rate_config_db SELECT * FROM mitra_rate_config_old_backup;
```

### Step 4: Update Schema.ts

Revert `src/lib/schema.ts` changes:

```typescript
// OLD schema (before 0005)
export const mitraRateConfigDB = pgTable('mitra_rate_config_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  mitraId: uuid('mitra_id').references(() => mitraDB.id).notNull(),
  subscriptionPackageId: uuid('subscription_package_id').references(() => subscriptionPackageDB.id),

  // Rate configuration
  monthlyRate: decimal('monthly_rate', { precision: 10, scale: 2 }).notNull(),

  // Effective period
  effectiveFrom: date('effective_from').notNull(),
  effectiveTo: date('effective_to'),

  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  createdBy: varchar('created_by', { length: 255 }),
  isActive: boolean('is_active').default(true),
});

// Also revert relations
export const mitraRateConfigRelations = relations(mitraRateConfigDB, ({ one }) => ({
  mitra: one(mitraDB, {
    fields: [mitraRateConfigDB.mitraId],
    references: [mitraDB.id],
  }),
  subscriptionPackage: one(subscriptionPackageDB, {
    fields: [mitraRateConfigDB.subscriptionPackageId],
    references: [subscriptionPackageDB.id],
  }),
}));
```

### Step 5: Rebuild Application

```bash
# Delete generated types
rm -rf node_modules/.drizzle

# Rebuild
npm run build

# Restart PM2 (if in production)
pm2 restart homa-staging
```

### Step 6: Verify Rollback

```sql
-- Check table structure
\d mitra_rate_config_db

-- Check data count
SELECT COUNT(*) FROM mitra_rate_config_db;

-- Check constraints
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'mitra_rate_config_db';
```

---

## Data Loss Warning

⚠️ **CRITICAL DATA LOSS WARNING** ⚠️

Migration 0005 **DROPS** the old `mitra_rate_config_db` table completely. Any data in the old table structure is **PERMANENTLY LOST** unless:

1. You backed up the table BEFORE running migration 0005
2. You can restore from a database snapshot taken before the migration

If you need to rollback:
- You will lose all rate configurations created in the new system
- You will need to manually recreate rates in the old format
- OR restore from a full database backup taken before migration 0005

---

## Post-Rollback Tasks

1. **Remove Migration File:** Delete `0005_mitra_rate_config_refactor.sql` from version control
2. **Update Drizzle Migrations:** Remove entry from `drizzle/neon-migration/meta/`
3. **Revert Git Commits:** Revert all commits related to Phase 01 Mitra Management simplification
4. **Test Application:**
   - Test mitra creation
   - Test payout calculation
   - Test rate queries
5. **Notify Team:** Inform all team members that rollback occurred

---

## Prevention for Future Migrations

To avoid data loss in future migrations:

1. **Always backup before schema changes:**
   ```bash
   pg_dump -U user -d homa_staging -t mitra_rate_config_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Test migrations on dev database first**

3. **Use data migration scripts that preserve old data:**
   - Instead of DROP TABLE, use ALTER TABLE when possible
   - Copy data to temporary tables before dropping
   - Implement reversible migrations

4. **Create backup tables automatically:**
   ```sql
   CREATE TABLE old_table_backup_YYYYMMDD AS SELECT * FROM old_table;
   ```

---

## Questions?

Contact: Development Team
Date: 2026-03-10
Related: feedback-phase-01-mitra-create-simplification.md
