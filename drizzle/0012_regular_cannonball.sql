ALTER TABLE "customer_db" ADD COLUMN "residential_type" varchar(50) DEFAULT 'House';--> statement-breakpoint
ALTER TABLE "subscription_package_db" ADD COLUMN "is_active" boolean DEFAULT true NOT NULL;