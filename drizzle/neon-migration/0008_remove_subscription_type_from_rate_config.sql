-- Migration: Remove subscription_type column from mitra_rate_config_db
-- Reason: Not used in payout calculation, simplified to per mitra per visits_per_week

ALTER TABLE "mitra_rate_config_db" DROP COLUMN IF EXISTS "subscription_type";
