CREATE TABLE IF NOT EXISTS "visit_action_history_db" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"visit_id" uuid NOT NULL,
	"action_type" varchar(50) NOT NULL,
	"old_value" jsonb,
	"new_value" jsonb,
	"changed_by" varchar(255),
	"changed_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "visit_action_history_db" ADD CONSTRAINT "visit_action_history_db_visit_id_visit_db_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visit_db"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
