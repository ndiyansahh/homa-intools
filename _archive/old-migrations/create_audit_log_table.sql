-- Create audit_log_db table for tracking all system changes
CREATE TABLE IF NOT EXISTS "audit_log_db" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" UUID NOT NULL,
  "user_email" VARCHAR(255) NOT NULL,
  "action" VARCHAR(100) NOT NULL,
  "entity_type" VARCHAR(50) NOT NULL,
  "entity_id" UUID NOT NULL,
  "old_value" JSONB,
  "new_value" JSONB,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "idx_audit_entity_type" ON "audit_log_db"("entity_type");
CREATE INDEX IF NOT EXISTS "idx_audit_entity_id" ON "audit_log_db"("entity_id");
CREATE INDEX IF NOT EXISTS "idx_audit_user_id" ON "audit_log_db"("user_id");
CREATE INDEX IF NOT EXISTS "idx_audit_created_at" ON "audit_log_db"("created_at");
CREATE INDEX IF NOT EXISTS "idx_audit_action" ON "audit_log_db"("action");

-- Comment on table
COMMENT ON TABLE "audit_log_db" IS 'Audit trail for all system changes including mitra, customer, attendance, and trial updates';
