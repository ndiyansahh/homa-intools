-- Migration: Update subscription_package_db structure
-- Drop and recreate table with correct structure

DROP TABLE IF EXISTS subscription_package_db CASCADE;

CREATE TABLE subscription_package_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_package VARCHAR(255) NOT NULL,
    price_per_qty VARCHAR(50) NOT NULL,
    price_numeric DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert the correct data
INSERT INTO subscription_package_db (subscription_package, price_per_qty, price_numeric) VALUES
('Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 'Rp1,125,000', 1125000),
('Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 'Rp1,650,000', 1650000),
('Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 'Rp562,500', 562500),
('Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 'Rp600,000', 600000),
('Trial', 'Rp0', 0);

-- Add comments for documentation
COMMENT ON TABLE subscription_package_db IS 'Subscription packages with simplified structure';
COMMENT ON COLUMN subscription_package_db.subscription_package IS 'Full package name including visit frequency and duration';
COMMENT ON COLUMN subscription_package_db.price_per_qty IS 'Price in formatted string for display';
COMMENT ON COLUMN subscription_package_db.price_numeric IS 'Price in numeric format for calculations';

-- Verify the data
SELECT * FROM subscription_package_db ORDER BY price_numeric;