-- Migration: Add trial conversion fields to customer_db table
-- Run this SQL to add the new columns needed for trial to customer conversion

-- Add total_sessions column
ALTER TABLE customer_db 
ADD COLUMN IF NOT EXISTS total_sessions INTEGER DEFAULT 0;

-- Add chosen_days column to store JSON array of selected days
ALTER TABLE customer_db 
ADD COLUMN IF NOT EXISTS chosen_days TEXT;

-- Add comments for documentation
COMMENT ON COLUMN customer_db.total_sessions IS 'Total number of sessions based on mitra availability';
COMMENT ON COLUMN customer_db.chosen_days IS 'JSON string array of chosen service days (Monday-Sunday)';

-- Update existing trial customers with default values
UPDATE customer_db 
SET total_sessions = 0 
WHERE total_sessions IS NULL 
  AND subscription_status IN ('Trial', 'Trial Scheduled');

-- Optional: Set sample chosen_days for existing trials (weekdays as example)
UPDATE customer_db 
SET chosen_days = '["Monday", "Wednesday", "Friday"]'
WHERE chosen_days IS NULL 
  AND subscription_status IN ('Trial', 'Trial Scheduled');

-- Verify the migration
SELECT 
  id, 
  customer_name, 
  subscription_status, 
  total_sessions, 
  chosen_days 
FROM customer_db 
WHERE subscription_status IN ('Trial', 'Trial Scheduled')
LIMIT 5;