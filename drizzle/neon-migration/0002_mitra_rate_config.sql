-- Migration for Feedback Items 1a, 1b, 1c: Monthly Payout Rates with Configurable System

-- Step 1: Add new fields to mitra_db (1a - monthly base rate)
ALTER TABLE "mitra_db" ADD COLUMN "monthly_base_rate" numeric(10, 2) DEFAULT '0';--> statement-breakpoint

-- Step 2: Add new fields to payout_db (1a - monthly rate and scheduled visits)
ALTER TABLE "payout_db" ADD COLUMN "monthly_rate" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
ALTER TABLE "payout_db" ADD COLUMN "scheduled_visits" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "payout_db" ADD COLUMN "breakdown" jsonb;--> statement-breakpoint

-- Step 3: Create new mitra_rate_config_db table (1b, 1c - configurable rates per mitra)
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
);--> statement-breakpoint

-- Step 4: Add foreign key constraints
DO $$ BEGIN
 ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "mitra_rate_config_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

DO $$ BEGIN
 ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "mitra_rate_config_db_subscription_package_id_subscription_package_db_id_fk" FOREIGN KEY ("subscription_package_id") REFERENCES "public"."subscription_package_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint

-- Step 5: Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_mitra_id" ON "mitra_rate_config_db" ("mitra_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_active" ON "mitra_rate_config_db" ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_mitra_rate_config_effective_dates" ON "mitra_rate_config_db" ("effective_from", "effective_to");--> statement-breakpoint

-- Step 6: Migrate existing data (copy baseRate to monthlyBaseRate)
UPDATE "mitra_db" SET "monthly_base_rate" = "base_rate" WHERE "base_rate" IS NOT NULL AND "base_rate" > 0;--> statement-breakpoint

-- Note: base_rate and pricePerVisit columns are kept for backward compatibility but marked as DEPRECATED in code
-- They will be removed in a future migration after all systems are updated
