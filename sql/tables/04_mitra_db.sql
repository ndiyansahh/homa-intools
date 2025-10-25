-- Mitra Database Table
-- Partners/cleaners information and rates

CREATE TABLE IF NOT EXISTS mitra_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mitra_name VARCHAR(255) NOT NULL,
    contact VARCHAR(20) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    village VARCHAR(100),
    postal_code VARCHAR(10),
    
    -- Mitra details
    mitra_type VARCHAR(20) NOT NULL DEFAULT 'Cleaner' CHECK (mitra_type IN ('Cleaner', 'Supervisor', 'Manager')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    
    -- Financial details
    base_rate DECIMAL(10,2) NOT NULL CHECK (base_rate > 0),
    commission_rate DECIMAL(5,2) DEFAULT 10.00 CHECK (commission_rate >= 0 AND commission_rate <= 100),
    total_earnings DECIMAL(12,2) DEFAULT 0,
    total_visits INTEGER DEFAULT 0,
    
    -- Performance metrics
    rating DECIMAL(2,1) DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
    total_reviews INTEGER DEFAULT 0,
    
    -- Metadata
    join_date DATE DEFAULT CURRENT_DATE,
    last_visit_date DATE,
    mitra_notes TEXT,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_mitra_name ON mitra_db(mitra_name);
CREATE INDEX IF NOT EXISTS idx_mitra_contact ON mitra_db(contact);
CREATE INDEX IF NOT EXISTS idx_mitra_city ON mitra_db(city);
CREATE INDEX IF NOT EXISTS idx_mitra_type ON mitra_db(mitra_type);
CREATE INDEX IF NOT EXISTS idx_mitra_status ON mitra_db(status, is_active);
CREATE INDEX IF NOT EXISTS idx_mitra_rating ON mitra_db(rating);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_mitra_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mitra_db_updated_at ON mitra_db;
CREATE TRIGGER trigger_update_mitra_db_updated_at
    BEFORE UPDATE ON mitra_db
    FOR EACH ROW
    EXECUTE FUNCTION update_mitra_db_updated_at();