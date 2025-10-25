-- Mitra Payout Database Table
-- Partner payment records and payroll

CREATE TABLE IF NOT EXISTS mitra_payout_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Mitra reference
    mitra_id UUID NOT NULL REFERENCES mitra_db(id),
    mitra_name VARCHAR(255) NOT NULL,
    
    -- Payout period
    payout_period_start DATE NOT NULL,
    payout_period_end DATE NOT NULL,
    payout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Financial calculations
    total_visits INTEGER DEFAULT 0,
    base_earnings DECIMAL(10,2) DEFAULT 0 CHECK (base_earnings >= 0),
    commission_earnings DECIMAL(10,2) DEFAULT 0 CHECK (commission_earnings >= 0),
    bonus_amount DECIMAL(10,2) DEFAULT 0 CHECK (bonus_amount >= 0),
    penalty_amount DECIMAL(10,2) DEFAULT 0 CHECK (penalty_amount >= 0),
    gross_amount DECIMAL(10,2) NOT NULL CHECK (gross_amount >= 0),
    
    -- Deductions
    tax_deduction DECIMAL(10,2) DEFAULT 0 CHECK (tax_deduction >= 0),
    other_deductions DECIMAL(10,2) DEFAULT 0 CHECK (other_deductions >= 0),
    total_deductions DECIMAL(10,2) DEFAULT 0 CHECK (total_deductions >= 0),
    net_amount DECIMAL(10,2) NOT NULL CHECK (net_amount >= 0),
    
    -- Payment details
    payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Bank Transfer', 'Cash', 'E-Wallet', 'Check')),
    payment_reference VARCHAR(100),
    bank_account VARCHAR(100),
    payment_status VARCHAR(20) DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Processing', 'Paid', 'Failed', 'Cancelled')),
    payment_confirmation_date TIMESTAMP WITH TIME ZONE,
    
    -- Performance metrics for period
    average_rating DECIMAL(2,1) DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    attendance_rate DECIMAL(5,2) DEFAULT 100.00,
    
    -- Documentation
    payout_notes TEXT,
    calculation_details JSONB,
    receipt_url TEXT,
    
    -- Approval workflow
    prepared_by VARCHAR(255),
    approved_by VARCHAR(255),
    approval_date TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_payout_period CHECK (payout_period_end >= payout_period_start),
    CONSTRAINT valid_payout_date CHECK (payout_date >= payout_period_end),
    CONSTRAINT unique_mitra_period UNIQUE (mitra_id, payout_period_start, payout_period_end)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_payout_mitra ON mitra_payout_db(mitra_id);
CREATE INDEX IF NOT EXISTS idx_payout_period ON mitra_payout_db(payout_period_start, payout_period_end);
CREATE INDEX IF NOT EXISTS idx_payout_date ON mitra_payout_db(payout_date);
CREATE INDEX IF NOT EXISTS idx_payout_status ON mitra_payout_db(payment_status);
CREATE INDEX IF NOT EXISTS idx_payout_method ON mitra_payout_db(payment_method);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_mitra_payout_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mitra_payout_db_updated_at ON mitra_payout_db;
CREATE TRIGGER trigger_update_mitra_payout_db_updated_at
    BEFORE UPDATE ON mitra_payout_db
    FOR EACH ROW
    EXECUTE FUNCTION update_mitra_payout_db_updated_at();

-- Trigger for auto-calculating payout amounts
CREATE OR REPLACE FUNCTION calculate_mitra_payout_amounts()
RETURNS TRIGGER AS $$
BEGIN
    -- Calculate gross amount
    NEW.gross_amount = COALESCE(NEW.base_earnings, 0) + 
                      COALESCE(NEW.commission_earnings, 0) + 
                      COALESCE(NEW.bonus_amount, 0) - 
                      COALESCE(NEW.penalty_amount, 0);
    
    -- Calculate total deductions
    NEW.total_deductions = COALESCE(NEW.tax_deduction, 0) + 
                          COALESCE(NEW.other_deductions, 0);
    
    -- Calculate net amount
    NEW.net_amount = NEW.gross_amount - NEW.total_deductions;
    
    -- Ensure net amount is not negative
    IF NEW.net_amount < 0 THEN
        NEW.net_amount = 0;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_mitra_payout_amounts ON mitra_payout_db;
CREATE TRIGGER trigger_calculate_mitra_payout_amounts
    BEFORE INSERT OR UPDATE ON mitra_payout_db
    FOR EACH ROW
    EXECUTE FUNCTION calculate_mitra_payout_amounts();

-- Function to auto-populate payout data from attendance records
CREATE OR REPLACE FUNCTION populate_payout_from_attendance()
RETURNS TRIGGER AS $$
DECLARE
    attendance_data RECORD;
    mitra_data RECORD;
BEGIN
    -- Get mitra information
    SELECT base_rate, commission_rate INTO mitra_data
    FROM mitra_db 
    WHERE id = NEW.mitra_id;
    
    -- Calculate earnings from attendance records
    SELECT 
        COUNT(*) as total_visits,
        SUM(mitra_earning) as total_base_earnings,
        SUM(commission_amount) as total_commission_earnings,
        AVG(quality_rating) as avg_rating
    INTO attendance_data
    FROM attendance_record_db
    WHERE mitra_id = NEW.mitra_id 
    AND visit_date >= NEW.payout_period_start 
    AND visit_date <= NEW.payout_period_end
    AND completion_status = 'Completed';
    
    -- Populate calculated values
    NEW.total_visits = COALESCE(attendance_data.total_visits, 0);
    NEW.base_earnings = COALESCE(attendance_data.total_base_earnings, 0);
    NEW.commission_earnings = COALESCE(attendance_data.total_commission_earnings, 0);
    NEW.average_rating = COALESCE(attendance_data.avg_rating, 0);
    
    -- Calculate attendance rate
    SELECT 
        CASE 
            WHEN scheduled_count > 0 THEN (completed_count::DECIMAL / scheduled_count::DECIMAL) * 100
            ELSE 100
        END as attendance_rate
    INTO NEW.attendance_rate
    FROM (
        SELECT 
            COUNT(*) as scheduled_count,
            SUM(CASE WHEN ar.completion_status = 'Completed' THEN 1 ELSE 0 END) as completed_count
        FROM attendance_schedule_db asd
        LEFT JOIN attendance_record_db ar ON asd.id = ar.schedule_id
        WHERE asd.mitra_id = NEW.mitra_id
        AND asd.scheduled_date >= NEW.payout_period_start
        AND asd.scheduled_date <= NEW.payout_period_end
    ) calc;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_populate_payout_from_attendance ON mitra_payout_db;
CREATE TRIGGER trigger_populate_payout_from_attendance
    BEFORE INSERT ON mitra_payout_db
    FOR EACH ROW
    EXECUTE FUNCTION populate_payout_from_attendance();