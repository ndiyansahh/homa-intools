-- Migration for Feedback Items 2a, 2b, 6b: System Configuration Toggles
-- This migration adds a system_config table to store toggleable settings
-- 2a: Mitra region filter toggle
-- 2b: Schedule max hours toggle
-- 6b: Historical visits lock toggle

-- Step 1: Create system_config_db table
CREATE TABLE IF NOT EXISTS "system_config_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(100) NOT NULL UNIQUE,
	"config_value" text NOT NULL,
	"data_type" varchar(20) DEFAULT 'string',
	"description" text,
	"category" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" varchar(255)
);--> statement-breakpoint

-- Step 2: Create index for faster lookups
CREATE INDEX IF NOT EXISTS "idx_system_config_key" ON "system_config_db" ("config_key");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_system_config_category" ON "system_config_db" ("category");--> statement-breakpoint

-- Step 3: Insert default config values for feedback 2a, 2b, and 6b
INSERT INTO "system_config_db" ("config_key", "config_value", "data_type", "description", "category", "is_active")
VALUES
	-- 2a: Mitra Assignment Region Filter
	(
		'enable_mitra_region_filter',
		'false',
		'boolean',
		'Enable filtering mitras by city/district (region). When disabled, all active mitras are available regardless of location assignment.',
		'mitra',
		true
	),
	-- 2b: Schedule Maximum Hours Restriction
	(
		'enable_schedule_max_hours',
		'false',
		'boolean',
		'Enable maximum 8 hours per day restriction for mitra scheduling. When disabled, mitras can be scheduled for unlimited hours per day.',
		'scheduling',
		true
	),
	-- 6b: Lock Historical Visits (Completed Visits Editing)
	(
		'lock_completed_visits',
		'false',
		'boolean',
		'Lock completed visits from being edited. When disabled, users can edit historical/completed visits even after the period ends.',
		'visits',
		true
	)
ON CONFLICT (config_key) DO NOTHING;--> statement-breakpoint

-- Note: All three toggles are set to 'false' by default
-- 2a: enable_mitra_region_filter = false (NO filter by region - user bebas pilih)
-- 2b: enable_schedule_max_hours = false (NO 8-hour limit - unlimited schedule)
-- 6b: lock_completed_visits = false (NO lock - can edit historical visits)
--
-- This implements the requirements:
-- - "No need filter" (2a)
-- - "No need to restrict" (2b)
-- - "Jangan locked once period habis" (6b)
--
-- The existing lock/filter code is KEPT but disabled via toggle (not deleted - sayang!)
