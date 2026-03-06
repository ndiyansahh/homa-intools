-- Add LTV field to customer_db table
ALTER TABLE customer_db 
ADD COLUMN IF NOT EXISTS ltv INTEGER DEFAULT 0;

-- Add comment for documentation
COMMENT ON COLUMN customer_db.ltv IS 'Lifetime Value in months calculated using DATEDIF formula';

-- Update existing records to have LTV = 0 if NULL
UPDATE customer_db SET ltv = 0 WHERE ltv IS NULL;