CREATE TABLE IF NOT EXISTS "attendance_record_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"schedule_id" uuid,
	"customer_id" uuid NOT NULL,
	"mitra_id" uuid NOT NULL,
	"subscription_package_id" uuid,
	"client_name" varchar(255) NOT NULL,
	"address" text NOT NULL,
	"subscription_package" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"new_end_date" date,
	"attendance_mitra_code" varchar(50) NOT NULL,
	"attendance_mitra_name" varchar(255) NOT NULL,
	"day_pattern" text,
	"visit_number" integer NOT NULL,
	"total_visits" integer NOT NULL,
	"visit_date" date NOT NULL,
	"visit_day" varchar(10) NOT NULL,
	"visit_week" integer,
	"visit_month" integer,
	"cleaner1" varchar(100),
	"cleaner2" varchar(100),
	"check_in_time" timestamp,
	"check_out_time" timestamp,
	"actual_duration" integer,
	"work_quality" varchar(20),
	"status" varchar(20) DEFAULT 'Scheduled',
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "attendance_schedule_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"mitra_id" uuid NOT NULL,
	"scheduled_date" timestamp NOT NULL,
	"scheduled_time" varchar(10),
	"status" varchar(20) DEFAULT 'Scheduled',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
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
CREATE TABLE IF NOT EXISTS "customer_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_name" varchar(255) NOT NULL,
	"contact" varchar(20) NOT NULL,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"district" varchar(100),
	"village" varchar(100),
	"postal_code" varchar(10),
	"assigned_mitra_id" uuid,
	"backup_mitra_id" uuid,
	"subscription_package_id" uuid,
	"subscription_package" varchar(255),
	"subscription_start" date,
	"subscription_end" date,
	"subscription_status" varchar(30) DEFAULT 'Active',
	"monthly_fee" numeric(10, 2) DEFAULT '0',
	"total_paid" numeric(10, 2) DEFAULT '0',
	"outstanding_balance" numeric(10, 2) DEFAULT '0',
	"customer_notes" text,
	"total_sessions" integer DEFAULT 0,
	"chosen_days" text,
	"day_pattern" text,
	"ltv" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"invoice_no" integer NOT NULL,
	"invoice_start_date" date NOT NULL,
	"invoice_years" integer NOT NULL,
	"invoice_months" integer NOT NULL,
	"invoice_days" integer NOT NULL,
	"invoice_subscription" varchar(50) DEFAULT 'Cleaning' NOT NULL,
	"invoice_customer_name" varchar(255) NOT NULL,
	"invoice_address" text NOT NULL,
	"invoice_phone_number" varchar(20) NOT NULL,
	"invoice_qty" integer NOT NULL,
	"invoice_price_per_qty" numeric(10, 2) NOT NULL,
	"invoice_promo_code" varchar(50),
	"invoice_promo_discount" numeric(10, 2) DEFAULT '0',
	"invoice_date" timestamp DEFAULT now(),
	"due_date" timestamp,
	"subtotal" numeric(12, 2) NOT NULL,
	"tax" numeric(10, 2) DEFAULT '0',
	"discount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'Pending',
	"paid_at" timestamp,
	"payment_method" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false,
	CONSTRAINT "invoice_db_invoice_number_unique" UNIQUE("invoice_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mitra_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mitra_name" varchar(255) NOT NULL,
	"mitra_code" varchar(50) NOT NULL,
	"mitra_nik" varchar(16) NOT NULL,
	"mitra_gender" varchar(10) NOT NULL,
	"mitra_dob" varchar(10) NOT NULL,
	"mitra_phone" varchar(12) NOT NULL,
	"contact" varchar(20),
	"address" text,
	"city" varchar(100),
	"district" varchar(100),
	"village" varchar(100),
	"postal_code" varchar(10),
	"mitra_bank_account" text,
	"mitra_bank_holder_name" varchar(255),
	"mitra_bank_account_number" varchar(50),
	"mitra_city_assignment" varchar(100),
	"mitra_location_assignment" text,
	"mitra_partnership" varchar(20) DEFAULT 'Full Time' NOT NULL,
	"mitra_tenure" integer DEFAULT 0,
	"mitra_exit_date" varchar(10),
	"mitra_bonus_commission" varchar(20) DEFAULT 'Eligible',
	"mitra_type" varchar(20) DEFAULT 'Cleaner' NOT NULL,
	"status" varchar(20) DEFAULT 'Active',
	"base_rate" numeric(10, 2) DEFAULT '0',
	"commission_rate" numeric(5, 2) DEFAULT '10.00',
	"total_earnings" numeric(12, 2) DEFAULT '0',
	"total_visits" integer DEFAULT 0,
	"rating" numeric(2, 1) DEFAULT '0',
	"total_reviews" integer DEFAULT 0,
	"join_date" date DEFAULT now(),
	"last_visit_date" date,
	"mitra_notes" text,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "mitra_db_mitra_code_unique" UNIQUE("mitra_code"),
	CONSTRAINT "mitra_db_mitra_nik_unique" UNIQUE("mitra_nik")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "mitra_payout_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mitra_id" uuid NOT NULL,
	"period_start" timestamp NOT NULL,
	"period_end" timestamp NOT NULL,
	"total_visits" integer DEFAULT 0,
	"total_hours" numeric(8, 2) DEFAULT '0',
	"base_amount" numeric(12, 2) DEFAULT '0',
	"commission_amount" numeric(12, 2) DEFAULT '0',
	"bonus_amount" numeric(10, 2) DEFAULT '0',
	"deduction_amount" numeric(10, 2) DEFAULT '0',
	"total_amount" numeric(12, 2) NOT NULL,
	"status" varchar(20) DEFAULT 'Pending',
	"approved_by" varchar(100),
	"approved_at" timestamp,
	"paid_at" timestamp,
	"payment_method" varchar(50),
	"payment_reference" varchar(100),
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"is_deleted" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payout_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payout_id" varchar(100) NOT NULL,
	"mitra_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"month" integer NOT NULL,
	"payout_date" date NOT NULL,
	"total_visits" integer DEFAULT 0,
	"price_per_visit" numeric(10, 2) DEFAULT '0',
	"base_payout" numeric(12, 2) DEFAULT '0',
	"bonus_amount" numeric(10, 2) DEFAULT '0',
	"total_payout" numeric(12, 2) DEFAULT '0',
	"status" varchar(20) DEFAULT 'Pending',
	"bonus_eligible" boolean DEFAULT false,
	"notes" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "payout_db_payout_id_unique" UNIQUE("payout_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "region_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"region_name" varchar(255) NOT NULL,
	"province" varchar(100) NOT NULL,
	"city" varchar(100) NOT NULL,
	"district" varchar(100) NOT NULL,
	"village" varchar(100),
	"postal_code" varchar(10) NOT NULL,
	"is_active" boolean DEFAULT true,
	"is_deleted" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscription_package_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subscription_package" varchar(255) NOT NULL,
	"price_per_qty" varchar(50) NOT NULL,
	"price_numeric" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"customer_id" uuid NOT NULL,
	"mitra_id" uuid NOT NULL,
	"original_mitra_id" uuid,
	"actual_mitra_id" uuid,
	"visit_number" integer NOT NULL,
	"scheduled_date" date NOT NULL,
	"scheduled_day" varchar(10) NOT NULL,
	"actual_date" date,
	"status" varchar(20) DEFAULT 'Scheduled',
	"duration_hours" integer DEFAULT 3,
	"visit_notes" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "visit_mitra_change_history_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"from_mitra_id" uuid NOT NULL,
	"to_mitra_id" uuid NOT NULL,
	"change_reason" text NOT NULL,
	"sequence_number" integer NOT NULL,
	"changed_by" uuid,
	"changed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_record_db" ADD CONSTRAINT "attendance_record_db_schedule_id_attendance_schedule_db_id_fk" FOREIGN KEY ("schedule_id") REFERENCES "public"."attendance_schedule_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_record_db" ADD CONSTRAINT "attendance_record_db_customer_id_customer_db_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_record_db" ADD CONSTRAINT "attendance_record_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_record_db" ADD CONSTRAINT "attendance_record_db_subscription_package_id_subscription_package_db_id_fk" FOREIGN KEY ("subscription_package_id") REFERENCES "public"."subscription_package_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_schedule_db" ADD CONSTRAINT "attendance_schedule_db_customer_id_customer_db_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "attendance_schedule_db" ADD CONSTRAINT "attendance_schedule_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_db" ADD CONSTRAINT "customer_db_assigned_mitra_id_mitra_db_id_fk" FOREIGN KEY ("assigned_mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_db" ADD CONSTRAINT "customer_db_backup_mitra_id_mitra_db_id_fk" FOREIGN KEY ("backup_mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "customer_db" ADD CONSTRAINT "customer_db_subscription_package_id_subscription_package_db_id_fk" FOREIGN KEY ("subscription_package_id") REFERENCES "public"."subscription_package_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_db" ADD CONSTRAINT "invoice_db_customer_id_customer_db_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "mitra_payout_db" ADD CONSTRAINT "mitra_payout_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payout_db" ADD CONSTRAINT "payout_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_db" ADD CONSTRAINT "visit_db_customer_id_customer_db_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customer_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_db" ADD CONSTRAINT "visit_db_mitra_id_mitra_db_id_fk" FOREIGN KEY ("mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_db" ADD CONSTRAINT "visit_db_original_mitra_id_mitra_db_id_fk" FOREIGN KEY ("original_mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_db" ADD CONSTRAINT "visit_db_actual_mitra_id_mitra_db_id_fk" FOREIGN KEY ("actual_mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_mitra_change_history_db" ADD CONSTRAINT "visit_mitra_change_history_db_visit_id_visit_db_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visit_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_mitra_change_history_db" ADD CONSTRAINT "visit_mitra_change_history_db_from_mitra_id_mitra_db_id_fk" FOREIGN KEY ("from_mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_mitra_change_history_db" ADD CONSTRAINT "visit_mitra_change_history_db_to_mitra_id_mitra_db_id_fk" FOREIGN KEY ("to_mitra_id") REFERENCES "public"."mitra_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
