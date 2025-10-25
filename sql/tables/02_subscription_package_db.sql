-- Subscription Package Database Table
-- Available cleaning packages and pricing

CREATE TABLE IF NOT EXISTS subscription_package_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    package_name VARCHAR(255) NOT NULL UNIQUE,
    package_type VARCHAR(50) NOT NULL CHECK (package_type IN ('Basic', 'Regular', 'Frequent', 'Special')),
    visits_per_week INTEGER NOT NULL CHECK (visits_per_week > 0),
    price_per_visit DECIMAL(10,2) NOT NULL CHECK (price_per_visit > 0),
    total_price DECIMAL(10,2) NOT NULL CHECK (total_price > 0),
    duration INTEGER NOT NULL DEFAULT 30 CHECK (duration > 0),
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_subscription_type ON subscription_package_db(package_type);
CREATE INDEX IF NOT EXISTS idx_subscription_active ON subscription_package_db(is_active, is_deleted);
CREATE INDEX IF NOT EXISTS idx_subscription_price ON subscription_package_db(total_price);

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

-- Trigger for auto-calculating total_price
CREATE OR REPLACE FUNCTION calculate_subscription_total_price()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_price = NEW.price_per_visit * NEW.visits_per_week * (NEW.duration / 7.0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_subscription_total_price ON subscription_package_db;
CREATE TRIGGER trigger_calculate_subscription_total_price
    BEFORE INSERT OR UPDATE ON subscription_package_db
    FOR EACH ROW
    EXECUTE FUNCTION calculate_subscription_total_price();

-- Insert master subscription package data
INSERT INTO subscription_package_db (package_name, package_type, visits_per_week, price_per_visit, duration, description) VALUES
('Regular Cleaning - Standard', 'Regular', 2, 50000, 30, 'Standard regular cleaning service - 2 visits per week'),
('Regular Cleaning - Premium', 'Regular', 2, 65000, 30, 'Premium regular cleaning service - 2 visits per week with extra care'),
('Frequent Cleaning - Intensive', 'Frequent', 3, 45000, 30, 'Intensive frequent cleaning - 3 visits per week'),
('Frequent Cleaning - Premium', 'Frequent', 3, 60000, 30, 'Premium frequent cleaning - 3 visits per week with deep clean'),
('Special Partnership - Office', 'Special', 1, 80000, 30, 'Special office cleaning partnership - 1 visit per week'),
('Special Partnership - Apartment Complex', 'Special', 1, 70000, 30, 'Special apartment complex cleaning - 1 visit per week'),
('Basic Cleaning - Economy', 'Basic', 1, 40000, 30, 'Basic economy cleaning service - 1 visit per week'),
('Basic Cleaning - Standard', 'Basic', 1, 55000, 30, 'Basic standard cleaning service - 1 visit per week')
ON CONFLICT (package_name) DO NOTHING;