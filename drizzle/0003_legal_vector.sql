ALTER TABLE "customer_db" ADD COLUMN "invoice_id" uuid;--> statement-breakpoint
ALTER TABLE "subscription_package_db" ADD COLUMN "visits_per_week" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "visit_db" ADD COLUMN "invoice_id" uuid;