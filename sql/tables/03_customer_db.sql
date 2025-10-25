-- Customer Database Table
-- Customer information and subscription details

CREATE TABLE IF NOT EXISTS customer_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_name VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    village VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Subscription details
    subscription_package_id UUID REFERENCES subscription_package_db(id),
    subscription_package VARCHAR(255), -- Backward compatibility
    subscription_start DATE,
    subscription_end DATE,
    subscription_status VARCHAR(30) DEFAULT 'Active' CHECK (subscription_status IN ('Active', 'Inactive', 'Suspended', 'Trial Scheduled', 'Expired', 'Cancelled')),
    
    -- Pricing
    monthly_fee DECIMAL(10,2) DEFAULT 0,
    total_paid DECIMAL(10,2) DEFAULT 0,
    outstanding_balance DECIMAL(10,2) DEFAULT 0,
    
    -- Metadata
    customer_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_subscription_dates CHECK (
        subscription_start IS NULL OR 
        subscription_end IS NULL OR 
        subscription_end >= subscription_start
    )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_customer_name ON customer_db(customer_name);
CREATE INDEX IF NOT EXISTS idx_customer_contact ON customer_db(contact);
CREATE INDEX IF NOT EXISTS idx_customer_city ON customer_db(city);
CREATE INDEX IF NOT EXISTS idx_customer_subscription ON customer_db(subscription_package_id);
CREATE INDEX IF NOT EXISTS idx_customer_status ON customer_db(subscription_status, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_dates ON customer_db(subscription_start, subscription_end);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_customer_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_customer_db_updated_at ON customer_db;
CREATE TRIGGER trigger_update_customer_db_updated_at
    BEFORE UPDATE ON customer_db
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_db_updated_at();

-- Trigger for auto-calculating outstanding balance
CREATE OR REPLACE FUNCTION calculate_customer_outstanding_balance()
RETURNS TRIGGER AS $$
BEGIN
    NEW.outstanding_balance = COALESCE(NEW.monthly_fee, 0) - COALESCE(NEW.total_paid, 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_customer_outstanding_balance ON customer_db;
CREATE TRIGGER trigger_calculate_customer_outstanding_balance
    BEFORE INSERT OR UPDATE ON customer_db
    FOR EACH ROW
    EXECUTE FUNCTION calculate_customer_outstanding_balance();