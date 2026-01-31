ALTER TABLE "mitra_db" ADD COLUMN "subscription_type" varchar(20) DEFAULT 'Regular';--> statement-breakpoint
ALTER TABLE "mitra_db" ADD COLUMN "bonus_rate" numeric(10, 2) DEFAULT '0';