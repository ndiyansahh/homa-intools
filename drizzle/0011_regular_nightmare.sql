ALTER TABLE "customer_db" RENAME COLUMN "backup_mitra_id" TO "backup_mitra_ids";--> statement-breakpoint
ALTER TABLE "customer_db" DROP CONSTRAINT "customer_db_backup_mitra_id_mitra_db_id_fk";
--> statement-breakpoint
ALTER TABLE "invoice_db" ALTER COLUMN "status" SET DEFAULT 'Open';