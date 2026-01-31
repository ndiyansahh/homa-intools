CREATE TABLE IF NOT EXISTS "audit_log_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"user_email" varchar(255) NOT NULL,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
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
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_adjustment_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" varchar(100) NOT NULL,
	"original_payout_id" uuid,
	"applied_payout_id" uuid,
	"mitra_id" uuid NOT NULL,
	"adjustment_amount" numeric(12, 2) NOT NULL,
	"adjustment_type" varchar(50) NOT NULL,
	"reason" text NOT NULL,
	"related_visit_id" uuid,
	"related_customer_id" uuid,
	"original_visits" integer,
	"corrected_visits" integer,
	"original_payout" numeric(12, 2),
	"corrected_payout" numeric(12, 2),
	"original_year" integer,
	"original_month" integer,
	"applied_year" integer,
	"applied_month" integer,
	"status" varchar(20) DEFAULT 'PENDING',
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"created_by" varchar(255),
	"applied_at" timestamp with time zone,
	"approved_by" varchar(255),
	"approved_at" timestamp with time zone,
	CONSTRAINT "payout_adjustment_db_adjustment_id_unique" UNIQUE("adjustment_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" varchar(100) NOT NULL,
	"mitra_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"payout_date" date NOT NULL,
	"monthly_rate" numeric(10, 2) DEFAULT '0',
	"scheduled_visits" integer DEFAULT 0,
	"total_visits" integer DEFAULT 0,
	"price_per_visit" numeric(10, 2) DEFAULT '0',
	"base_payout" numeric(12, 2) DEFAULT '0',
	"bonus_amount" numeric(10, 2) DEFAULT '0',
	"total_payout" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'Pending',
	"bonus_eligible" boolean DEFAULT false,
	"breakdown" jsonb,
	"notes" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payout_db_payout_id_unique" UNIQUE("payout_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "system_config_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"config_key" varchar(100) NOT NULL,
	"config_value" text NOT NULL,
	"data_type" varchar(20) DEFAULT 'string',
	"description" text,
	"category" varchar(50),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"updated_by" varchar(255),
	CONSTRAINT "system_config_db_config_key_unique" UNIQUE("config_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"role" varchar(20) DEFAULT 'STAFF' NOT NULL,
	"must_change_password" boolean DEFAULT true NOT NULL,
	"failed_login_attempts" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "user_db_email_unique" UNIQUE("email")
);
--> statement-breakpoint
-- ALTER TABLE "attendance_record_db" ADD COLUMN "updated_by" varchar(255);--> statement-breakpoint
-- ALTER TABLE "attendance_schedule_db" ADD COLUMN "updated_by" varchar(255);--> statement-breakpoint
-- ALTER TABLE "mitra_db" ADD COLUMN "monthly_base_rate" numeric(10, 2) DEFAULT '0';--> statement-breakpoint
-- ALTER TABLE "visit_db" ADD COLUMN "updated_by" varchar(255);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "mitra_rate_config_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mitra_rate_config_db" ADD CONSTRAINT "mitra_rate_config_db_subscription_package_id_subscription_package_db_id_fk" FOREIGN KEY ("subscription_package_id") REFERENCES "public"."subscription_package_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_adjustment_db" ADD CONSTRAINT "payout_adjustment_db_original_payout_id_payout_db_id_fk" FOREIGN KEY ("original_payout_id") REFERENCES "public"."payout_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_adjustment_db" ADD CONSTRAINT "payout_adjustment_db_applied_payout_id_payout_db_id_fk" FOREIGN KEY ("applied_payout_id") REFERENCES "public"."payout_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_adjustment_db" ADD CONSTRAINT "payout_adjustment_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_adjustment_db" ADD CONSTRAINT "payout_adjustment_db_related_visit_id_visit_db_id_fk" FOREIGN KEY ("related_visit_id") REFERENCES "public"."visit_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_adjustment_db" ADD CONSTRAINT "payout_adjustment_db_related_customer_id_customer_db_id_fk" FOREIGN KEY ("related_customer_id") REFERENCES "public"."customer_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_db" ADD CONSTRAINT "payout_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
