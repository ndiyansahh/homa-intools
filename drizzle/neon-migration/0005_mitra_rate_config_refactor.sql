-- Migration: Refactor mitra_rate_config_db table for multi-rate system
-- Phase 01 - Mitra Management Simplification (Feedback #1)
-- Date: 2026-03-10
--
-- Changes:
-- 1. Drop old mitra_rate_config_db table (wrong structure from 0002 migration)
-- 2. Create new mitra_rate_config_db with visits_per_week based structure
-- 3. Add indexes for performance
-- 4. Add unique constraint for (mitra_id, visits_per_week)

-- Step 1: Drop existing mitra_rate_config_db table
DROP TABLE IF EXISTS "mitra_rate_config_db" CASCADE;--> statement-breakpoint

-- Step 2: Create new mitra_rate_config_db table with correct structure
CREATE TABLE IF NOT EXISTS "mitra_rate_config_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mitra_id" uuid NOT NULL,
	"subscription_type" varchar(50) NOT NULL,
	"visits_per_week" integer NOT NULL,
	"payout_rate" numeric(12, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"created_by" uuid
);--> statement-breakpoint

-- Step 3: Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "mitra_rate_config_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "mitra_rate_config_db_created_by_user_db_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Step 4: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_mitra_id" ON "mitra_rate_config_db" ("mitra_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_visits_per_week" ON "mitra_rate_config_db" ("visits_per_week");--> statement-breakpoint

-- Step 5: Create unique constraint (one rate per mitra per visit frequency)
ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "unique_mitra_visits_per_week" UNIQUE ("mitra_id", "visits_per_week");--> statement-breakpoint

-- Note: Data migration must be run separately using scripts/migrate-mitra-rates.ts
-- This will copy existing payout rates from mitra_db to mitra_rate_config_db
