-- Subscription Package Database Table
-- Available cleaning packages and pricing

CREATE TABLE IF NOT EXISTS subscription_package_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_package VARCHAR(255) NOT NULL,
    price_per_qty VARCHAR(50) NOT NULL,
    price_numeric DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_subscription_package_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_subscription_package_db_updated_at ON subscription_package_db;
CREATE TRIGGER trigger_update_subscription_package_db_updated_at
    BEFORE UPDATE ON subscription_package_db
    FOR EACH ROW
    EXECUTE FUNCTION update_subscription_package_db_updated_at();

-- Insert master subscription package data
INSERT INTO subscription_package_db (subscription_package, price_per_qty, price_numeric) VALUES
('Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 'Rp1,125,000', 1125000),
('Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 'Rp1,650,000', 1650000),
('Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 'Rp562,500', 562500),
('Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 'Rp600,000', 600000),
('Trial', 'Rp0', 0)
ON CONFLICT DO NOTHING;