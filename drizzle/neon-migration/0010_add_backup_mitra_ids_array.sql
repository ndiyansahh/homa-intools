-- Migration: Replace backup_mitra_id (single uuid) with backup_mitra_ids (uuid array)
-- Preserves existing single backup mitra data by migrating to the new array column

ALTER TABLE "customer_db" ADD COLUMN IF NOT EXISTS "backup_mitra_ids" uuid[] DEFAULT '{}';

-- Migrate existing single backup mitra to the new array column (if old column exists)
UPDATE "customer_db"
SET "backup_mitra_ids" = ARRAY["backup_mitra_id"]
WHERE "backup_mitra_id" IS NOT NULL;

ALTER TABLE "customer_db" DROP COLUMN IF EXISTS "backup_mitra_id";
