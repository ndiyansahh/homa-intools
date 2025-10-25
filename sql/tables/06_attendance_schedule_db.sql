-- Attendance Schedule Database Table
-- Scheduled cleaning visits

CREATE TABLE IF NOT EXISTS attendance_schedule_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- References
    customer_id UUID NOT NULL REFERENCES customer_db(id),
    mitra_id UUID NOT NULL REFERENCES mitra_db(id),
    customer_name VARCHAR(255) NOT NULL,
    mitra_name VARCHAR(255) NOT NULL,
    
    -- Schedule details
    scheduled_date DATE NOT NULL,
    scheduled_time TIME NOT NULL,
    estimated_duration INTEGER DEFAULT 120, -- in minutes
    visit_type VARCHAR(50) DEFAULT 'Regular' CHECK (visit_type IN ('Regular', 'Deep Clean', 'Maintenance', 'Trial')),
    
    -- Location details
    address TEXT NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    special_instructions TEXT,
    
    -- Status and tracking
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In Progress', 'Completed', 'Cancelled', 'Rescheduled')),
    priority VARCHAR(10) DEFAULT 'Normal' CHECK (priority IN ('Low', 'Normal', 'High', 'Urgent')),
    
    -- Rescheduling info
    original_date DATE,
    reschedule_reason TEXT,
    reschedule_count INTEGER DEFAULT 0,
    
    -- Metadata
    created_by VARCHAR(255),
    schedule_notes TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_schedule_time CHECK (scheduled_date >= CURRENT_DATE - INTERVAL '1 day')
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_schedule_customer ON attendance_schedule_db(customer_id);
CREATE INDEX IF NOT EXISTS idx_schedule_mitra ON attendance_schedule_db(mitra_id);
CREATE INDEX IF NOT EXISTS idx_schedule_date ON attendance_schedule_db(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_schedule_status ON attendance_schedule_db(status);
CREATE INDEX IF NOT EXISTS idx_schedule_city ON attendance_schedule_db(city);
CREATE INDEX IF NOT EXISTS idx_schedule_priority ON attendance_schedule_db(priority);
CREATE INDEX IF NOT EXISTS idx_schedule_daily ON attendance_schedule_db(scheduled_date, scheduled_time);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_attendance_schedule_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_attendance_schedule_db_updated_at ON attendance_schedule_db;
CREATE TRIGGER trigger_update_attendance_schedule_db_updated_at
    BEFORE UPDATE ON attendance_schedule_db
    FOR EACH ROW
    EXECUTE FUNCTION update_attendance_schedule_db_updated_at();

-- Trigger for tracking reschedule count
CREATE OR REPLACE FUNCTION track_reschedule_count()
RETURNS TRIGGER AS $$
BEGIN
    -- If status changed to 'Rescheduled', increment counter
    IF OLD.status != 'Rescheduled' AND NEW.status = 'Rescheduled' THEN
        NEW.reschedule_count = COALESCE(OLD.reschedule_count, 0) + 1;
        
        -- Store original date if not already set
        IF NEW.original_date IS NULL THEN
            NEW.original_date = OLD.scheduled_date;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_track_reschedule_count ON attendance_schedule_db;
CREATE TRIGGER trigger_track_reschedule_count
    BEFORE UPDATE ON attendance_schedule_db
    FOR EACH ROW
    EXECUTE FUNCTION track_reschedule_count();