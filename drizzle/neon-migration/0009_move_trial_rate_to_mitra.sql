-- Migration: Move trial_rate_per_visit from mitra_rate_config_db to mitra_db
ALTER TABLE "mitra_db" ADD COLUMN IF NOT EXISTS "trial_rate_per_visit" NUMERIC(10,2);

-- Copy trial rate from rate config to mitra (use the first non-null value per mitra)
UPDATE "mitra_db" m
SET "trial_rate_per_visit" = (
  SELECT "trial_rate_per_visit"
  FROM "mitra_rate_config_db" rc
  WHERE rc."mitra_id" = m."id"
    AND rc."trial_rate_per_visit" IS NOT NULL
  LIMIT 1
);

ALTER TABLE "mitra_rate_config_db" DROP COLUMN IF EXISTS "trial_rate_per_visit";
