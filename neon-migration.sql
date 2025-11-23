-- HOMA Staging Database Migration
-- Run this in Neon SQL Editor

-- 1. Create audit log table
CREATE TABLE IF NOT EXISTS "audit_log_db" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" varchar(255) NOT NULL,
  "user_email" varchar(255) NOT NULL,
  "action" varchar(100) NOT NULL,
  "entity_type" varchar(50) NOT NULL,
  "entity_id" varchar(255) NOT NULL,
  "old_value" jsonb,
  "new_value" jsonb,
  "ip_address" varchar(50),
  "user_agent" text,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_audit_entity ON "audit_log_db"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS idx_audit_created ON "audit_log_db"("created_at");
CREATE INDEX IF NOT EXISTS idx_audit_user ON "audit_log_db"("user_id");

-- 3. Verify table created
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'audit_log_db'
ORDER BY ordinal_position;

-- Expected output: 10 rows showing all columns of audit_log_db table
