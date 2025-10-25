-- Fix subscription_status constraint to allow 'Trial Scheduled' and 'Cancelled'
-- Update the constraint to include the missing values that are used in the application

BEGIN;

-- First, drop the existing constraint
ALTER TABLE customer_db DROP CONSTRAINT IF EXISTS customer_db_subscription_status_check;

-- Add the updated constraint with all valid status values
ALTER TABLE customer_db ADD CONSTRAINT customer_db_subscription_status_check 
    CHECK (subscription_status IN ('Active', 'Inactive', 'Suspended', 'Trial', 'Trial Scheduled', 'Expired', 'Cancelled'));

-- Also update the column length to accommodate longer status names
ALTER TABLE customer_db ALTER COLUMN subscription_status TYPE VARCHAR(30);

COMMIT;