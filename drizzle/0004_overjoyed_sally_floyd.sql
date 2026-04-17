ALTER TABLE "customer_db" ADD COLUMN IF NOT EXISTS "churn_tag" varchar(100);--> statement-breakpoint
ALTER TABLE "customer_db" ADD COLUMN IF NOT EXISTS "churn_reason" text;
