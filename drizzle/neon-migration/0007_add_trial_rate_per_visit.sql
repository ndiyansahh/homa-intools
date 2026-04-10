-- Migration: Add trial_rate_per_visit column to mitra_rate_config_db
-- Purpose: Allow configuring per-visit rate for trial visits per mitra
-- Date: 2026-04-09

ALTER TABLE "mitra_rate_config_db"
ADD COLUMN IF NOT EXISTS "trial_rate_per_visit" numeric(10, 2) DEFAULT NULL;

COMMENT ON COLUMN "mitra_rate_config_db"."trial_rate_per_visit" IS
  'Flat rate per trial visit (IDR). NULL = mitra not eligible for trial payout. Default: 100000';
