-- Attendance Record Database Table
-- Completed cleaning visit records

CREATE TABLE IF NOT EXISTS attendance_record_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    schedule_id UUID REFERENCES attendance_schedule_db(id),
    customer_id UUID NOT NULL REFERENCES customer_db(id),
    mitra_id UUID NOT NULL REFERENCES mitra_db(id),
    customer_name VARCHAR(255) NOT NULL,
    mitra_name VARCHAR(255) NOT NULL,
    
    -- Visit details
    visit_date DATE NOT NULL,
    check_in_time TIMESTAMP WITH TIME ZONE,
    check_out_time TIMESTAMP WITH TIME ZONE,
    actual_duration INTEGER, -- in minutes
    visit_type VARCHAR(50) DEFAULT 'Regular',
    
    -- Location and service
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    services_performed TEXT[],
    
    -- Quality and feedback
    completion_status VARCHAR(20) DEFAULT 'Completed' CHECK (completion_status IN ('Completed', 'Partial', 'Cancelled', 'No Show')),
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    customer_feedback TEXT,
    mitra_notes TEXT,
    
    -- Issues and photos
    issues_reported TEXT[],
    photos_taken TEXT[], -- URLs to photos
    before_photos TEXT[],
    after_photos TEXT[],
    
    -- Financial
    service_fee DECIMAL(10,2),
    mitra_earning DECIMAL(10,2),
    commission_amount DECIMAL(10,2),
    
    -- Verification
    customer_signature TEXT, -- Base64 or URL
    verified_by VARCHAR(255),
    verification_time TIMESTAMP WITH TIME ZONE,
    
    -- Metadata
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_visit_times CHECK (
        check_in_time IS NULL OR 
        check_out_time IS NULL OR 
        check_out_time > check_in_time
    )
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_record_schedule ON attendance_record_db(schedule_id);
CREATE INDEX IF NOT EXISTS idx_record_customer ON attendance_record_db(customer_id);
CREATE INDEX IF NOT EXISTS idx_record_mitra ON attendance_record_db(mitra_id);
CREATE INDEX IF NOT EXISTS idx_record_visit_date ON attendance_record_db(visit_date);
CREATE INDEX IF NOT EXISTS idx_record_city ON attendance_record_db(city);
CREATE INDEX IF NOT EXISTS idx_record_status ON attendance_record_db(completion_status);
CREATE INDEX IF NOT EXISTS idx_record_rating ON attendance_record_db(quality_rating);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_record_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_record_db_updated_at ON attendance_record_db;
CREATE TRIGGER trigger_update_attendance_record_db_updated_at
    BEFORE UPDATE ON attendance_record_db
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_record_db_updated_at();

-- Trigger for auto-calculating duration and earnings
CREATE OR REPLACE FUNCTION calculate_attendance_metrics()
RETURNS TRIGGER AS $$
DECLARE
    mitra_rate DECIMAL(10,2);
    mitra_commission DECIMAL(5,2);
BEGIN
    -- Calculate actual duration if check times are available
    IF NEW.check_in_time IS NOT NULL AND NEW.check_out_time IS NOT NULL THEN
        NEW.actual_duration = EXTRACT(EPOCH FROM (NEW.check_out_time - NEW.check_in_time)) / 60;
    END IF;
    
    -- Get mitra rate and commission
    SELECT base_rate, commission_rate 
    INTO mitra_rate, mitra_commission
    FROM mitra_db 
    WHERE id = NEW.mitra_id;
    
    -- Calculate earnings if service fee is provided
    IF NEW.service_fee IS NOT NULL AND mitra_rate IS NOT NULL THEN
        NEW.commission_amount = NEW.service_fee * (mitra_commission / 100);
        NEW.mitra_earning = mitra_rate + COALESCE(NEW.commission_amount, 0);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_attendance_metrics ON attendance_record_db;
CREATE TRIGGER trigger_calculate_attendance_metrics
    BEFORE INSERT OR UPDATE ON attendance_record_db
    FOR EACH ROW
    EXECUTE FUNCTION calculate_attendance_metrics();

-- Trigger to update mitra statistics
CREATE OR REPLACE FUNCTION update_mitra_stats_from_attendance()
RETURNS TRIGGER AS $$
BEGIN
    -- Update mitra statistics when attendance record is inserted/updated
    IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.completion_status != NEW.completion_status) THEN
        UPDATE mitra_db 
        SET 
            total_visits = (
                SELECT COUNT(*) 
                FROM attendance_record_db 
                WHERE mitra_id = NEW.mitra_id 
                AND completion_status = 'Completed'
            ),
            total_earnings = (
                SELECT COALESCE(SUM(mitra_earning), 0) 
                FROM attendance_record_db 
                WHERE mitra_id = NEW.mitra_id 
                AND completion_status = 'Completed'
            ),
            rating = (
                SELECT COALESCE(AVG(quality_rating::DECIMAL), 0)
                FROM attendance_record_db 
                WHERE mitra_id = NEW.mitra_id 
                AND quality_rating IS NOT NULL
            ),
            total_reviews = (
                SELECT COUNT(*) 
                FROM attendance_record_db 
                WHERE mitra_id = NEW.mitra_id 
                AND quality_rating IS NOT NULL
            ),
            last_visit_date = (
                SELECT MAX(visit_date)
                FROM attendance_record_db 
                WHERE mitra_id = NEW.mitra_id 
                AND completion_status = 'Completed'
            )
        WHERE id = NEW.mitra_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_mitra_stats_from_attendance ON attendance_record_db;
CREATE TRIGGER trigger_update_mitra_stats_from_attendance
    AFTER INSERT OR UPDATE ON attendance_record_db
    FOR EACH ROW
    EXECUTE FUNCTION update_mitra_stats_from_attendance();