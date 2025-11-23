ALTER TABLE "attendance_record_db" ADD COLUMN "updated_by" varchar(255);--> statement-breakpoint
ALTER TABLE "attendance_schedule_db" ADD COLUMN "updated_by" varchar(255);--> statement-breakpoint
ALTER TABLE "visit_db" ADD COLUMN "updated_by" varchar(255);