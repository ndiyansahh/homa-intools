-- Manual Migration: Add Mitra Change Tracking to Visit System
-- Created: 2025-11-19
-- Purpose: Add originalMitraId and actualMitraId to visit_db table and create visit_mitra_change_history_db table

-- Step 1: Add new columns to visit_db (if they don't exist)
DO $$
BEGIN
  -- Add original_mitra_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visit_db' AND column_name = 'original_mitra_id'
  ) THEN
    ALTER TABLE visit_db ADD COLUMN original_mitra_id uuid;
    ALTER TABLE visit_db ADD CONSTRAINT visit_db_original_mitra_id_mitra_db_id_fk
      FOREIGN KEY (original_mitra_id) REFERENCES mitra_db(id);
  END IF;

  -- Add actual_mitra_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'visit_db' AND column_name = 'actual_mitra_id'
  ) THEN
    ALTER TABLE visit_db ADD COLUMN actual_mitra_id uuid;
    ALTER TABLE visit_db ADD CONSTRAINT visit_db_actual_mitra_id_mitra_db_id_fk
      FOREIGN KEY (actual_mitra_id) REFERENCES mitra_db(id);
  END IF;
END $$;

-- Step 2: Migrate existing data (copy mitra_id to original_mitra_id and actual_mitra_id)
UPDATE visit_db
SET original_mitra_id = mitra_id, actual_mitra_id = mitra_id
WHERE original_mitra_id IS NULL AND actual_mitra_id IS NULL;

-- Step 3: Create visit_mitra_change_history_db table (if it doesn't exist)
CREATE TABLE IF NOT EXISTS visit_mitra_change_history_db (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  visit_id uuid NOT NULL,
  from_mitra_id uuid NOT NULL,
  to_mitra_id uuid NOT NULL,
  change_reason text NOT NULL,
  sequence_number integer NOT NULL,
  changed_by uuid,
  changed_at timestamp with time zone DEFAULT now()
);

-- Step 4: Add foreign key constraints for visit_mitra_change_history_db (if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visit_mitra_change_history_db_visit_id_visit_db_id_fk'
  ) THEN
    ALTER TABLE visit_mitra_change_history_db
      ADD CONSTRAINT visit_mitra_change_history_db_visit_id_visit_db_id_fk
      FOREIGN KEY (visit_id) REFERENCES visit_db(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visit_mitra_change_history_db_from_mitra_id_mitra_db_id_fk'
  ) THEN
    ALTER TABLE visit_mitra_change_history_db
      ADD CONSTRAINT visit_mitra_change_history_db_from_mitra_id_mitra_db_id_fk
      FOREIGN KEY (from_mitra_id) REFERENCES mitra_db(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'visit_mitra_change_history_db_to_mitra_id_mitra_db_id_fk'
  ) THEN
    ALTER TABLE visit_mitra_change_history_db
      ADD CONSTRAINT visit_mitra_change_history_db_to_mitra_id_mitra_db_id_fk
      FOREIGN KEY (to_mitra_id) REFERENCES mitra_db(id);
  END IF;
END $$;

-- Step 5: Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_visit_mitra_change_history_visit_id
  ON visit_mitra_change_history_db(visit_id);

-- Verification queries (comment out after successful migration)
-- SELECT COUNT(*) as total_visits,
--        COUNT(original_mitra_id) as has_original,
--        COUNT(actual_mitra_id) as has_actual
-- FROM visit_db;
