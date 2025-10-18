-- HOMA Database Schema
-- PostgreSQL database initialization script
-- Created: 2025-01-18

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create database (run this separately if needed)
-- CREATE DATABASE homa_db;

-- ====================================
-- REGION TABLE (Master Data)
-- ====================================
CREATE TABLE IF NOT EXISTS region_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    region_name VARCHAR(100) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    postal_code VARCHAR(10),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS region_name_idx ON region_db(region_name);
CREATE INDEX IF NOT EXISTS city_idx ON region_db(city);

-- ====================================
-- SUBSCRIPTION PACKAGE TABLE (Master Data)
-- ====================================
CREATE TABLE IF NOT EXISTS subscription_package_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    package_name VARCHAR(100) NOT NULL,
    package_type VARCHAR(50) NOT NULL CHECK (package_type IN ('Regular', 'Frequent', 'Special', 'Basic')),
    visits_per_week INTEGER NOT NULL CHECK (visits_per_week > 0),
    price_per_visit DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    duration INTEGER DEFAULT 30 CHECK (duration > 0),
    is_active BOOLEAN DEFAULT TRUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS package_type_idx ON subscription_package_db(package_type);

-- ====================================
-- MITRA TABLE (Cleaners/Partners)
-- ====================================
CREATE TABLE IF NOT EXISTS mitra_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no SERIAL UNIQUE,
    mitra_name VARCHAR(100) NOT NULL,
    contact VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    mitra_type VARCHAR(20) NOT NULL CHECK (mitra_type IN ('Cleaner', 'Supervisor', 'Manager')),
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Inactive', 'Suspended')),
    join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    base_rate DECIMAL(10, 2),
    commission_rate DECIMAL(5, 2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS mitra_name_idx ON mitra_db(mitra_name);
CREATE INDEX IF NOT EXISTS mitra_type_idx ON mitra_db(mitra_type);
CREATE INDEX IF NOT EXISTS mitra_status_idx ON mitra_db(status);

-- ====================================
-- CUSTOMER TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS customer_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no SERIAL UNIQUE,
    customer_name VARCHAR(100) NOT NULL,
    acquisition VARCHAR(20) NOT NULL CHECK (acquisition IN ('HOMA', 'Altrix')),
    contact VARCHAR(20),
    address TEXT NOT NULL,
    village VARCHAR(100),
    district VARCHAR(100),
    city VARCHAR(100),
    postal_code VARCHAR(10),
    residential_type VARCHAR(50) CHECK (residential_type IN ('House', 'Office Space', 'Apartment')),
    
    -- Subscription info
    subscription_package_id UUID REFERENCES subscription_package_db(id),
    qty_package INTEGER DEFAULT 1 CHECK (qty_package > 0),
    ltv DECIMAL(12, 2),
    first_date_subscription TIMESTAMP,
    
    -- Status and assignment
    status VARCHAR(20) DEFAULT 'Active' CHECK (status IN ('Active', 'Churn', 'Inactive', 'Pending')),
    cleaner1_id UUID REFERENCES mitra_db(id),
    cleaner2_id UUID REFERENCES mitra_db(id),
    
    -- Churn info
    churn_tag VARCHAR(20) DEFAULT 'N/A' CHECK (churn_tag IN ('Internal', 'External', 'N/A')),
    churn_reason TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT different_cleaners CHECK (cleaner1_id != cleaner2_id OR cleaner2_id IS NULL)
);

CREATE INDEX IF NOT EXISTS customer_name_idx ON customer_db(customer_name);
CREATE INDEX IF NOT EXISTS acquisition_idx ON customer_db(acquisition);
CREATE INDEX IF NOT EXISTS customer_status_idx ON customer_db(status);
CREATE INDEX IF NOT EXISTS customer_city_idx ON customer_db(city);

-- ====================================
-- INVOICE TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS invoice_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID NOT NULL REFERENCES customer_db(id) ON DELETE CASCADE,
    
    -- Invoice details
    invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    due_date TIMESTAMP,
    subtotal DECIMAL(12, 2) NOT NULL CHECK (subtotal >= 0),
    tax DECIMAL(10, 2) DEFAULT 0 CHECK (tax >= 0),
    discount DECIMAL(10, 2) DEFAULT 0 CHECK (discount >= 0),
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Paid', 'Overdue', 'Cancelled')),
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS invoice_number_idx ON invoice_db(invoice_number);
CREATE INDEX IF NOT EXISTS invoice_customer_idx ON invoice_db(customer_id);
CREATE INDEX IF NOT EXISTS invoice_status_idx ON invoice_db(status);
CREATE INDEX IF NOT EXISTS invoice_date_idx ON invoice_db(invoice_date);

-- ====================================
-- ATTENDANCE SCHEDULE TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS attendance_schedule_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES customer_db(id) ON DELETE CASCADE,
    mitra_id UUID NOT NULL REFERENCES mitra_db(id),
    
    -- Schedule details
    scheduled_date TIMESTAMP NOT NULL,
    scheduled_time VARCHAR(10), -- HH:MM format
    duration INTEGER DEFAULT 120 CHECK (duration > 0), -- minutes
    
    -- Status
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'Completed', 'Cancelled', 'No-Show')),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS schedule_customer_idx ON attendance_schedule_db(customer_id);
CREATE INDEX IF NOT EXISTS schedule_mitra_idx ON attendance_schedule_db(mitra_id);
CREATE INDEX IF NOT EXISTS scheduled_date_idx ON attendance_schedule_db(scheduled_date);
CREATE INDEX IF NOT EXISTS schedule_status_idx ON attendance_schedule_db(status);

-- ====================================
-- ATTENDANCE RECORD TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS attendance_record_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no SERIAL UNIQUE,
    schedule_id UUID REFERENCES attendance_schedule_db(id),
    customer_id UUID NOT NULL REFERENCES customer_db(id) ON DELETE CASCADE,
    mitra_id UUID NOT NULL REFERENCES mitra_db(id),
    
    -- Client info (denormalized for reporting)
    client_name VARCHAR(100) NOT NULL,
    address TEXT NOT NULL,
    package VARCHAR(100) NOT NULL,
    
    -- Date info
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    new_end_date TIMESTAMP, -- For extensions
    
    -- Cleaner assignments
    cleaner1 VARCHAR(100) NOT NULL,
    cleaner2 VARCHAR(100),
    
    -- Attendance details
    check_in_time TIMESTAMP,
    check_out_time TIMESTAMP,
    actual_duration INTEGER, -- minutes
    work_quality VARCHAR(20) CHECK (work_quality IN ('Excellent', 'Good', 'Fair', 'Poor')),
    
    -- Status and notes
    status VARCHAR(20) DEFAULT 'Scheduled' CHECK (status IN ('Scheduled', 'In-Progress', 'Completed', 'Cancelled')),
    notes TEXT,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_date_range CHECK (end_date IS NULL OR start_date <= end_date),
    CONSTRAINT valid_new_end_date CHECK (new_end_date IS NULL OR start_date <= new_end_date),
    CONSTRAINT valid_check_times CHECK (check_out_time IS NULL OR check_in_time <= check_out_time)
);

CREATE INDEX IF NOT EXISTS record_client_name_idx ON attendance_record_db(client_name);
CREATE INDEX IF NOT EXISTS record_customer_idx ON attendance_record_db(customer_id);
CREATE INDEX IF NOT EXISTS record_mitra_idx ON attendance_record_db(mitra_id);
CREATE INDEX IF NOT EXISTS record_start_date_idx ON attendance_record_db(start_date);
CREATE INDEX IF NOT EXISTS record_status_idx ON attendance_record_db(status);

-- ====================================
-- MITRA PAYOUT TABLE
-- ====================================
CREATE TABLE IF NOT EXISTS mitra_payout_db (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mitra_id UUID NOT NULL REFERENCES mitra_db(id),
    
    -- Payout period
    period_start TIMESTAMP NOT NULL,
    period_end TIMESTAMP NOT NULL,
    
    -- Calculation details
    total_visits INTEGER DEFAULT 0 CHECK (total_visits >= 0),
    total_hours DECIMAL(8, 2) DEFAULT 0 CHECK (total_hours >= 0),
    base_amount DECIMAL(12, 2) DEFAULT 0 CHECK (base_amount >= 0),
    commission_amount DECIMAL(12, 2) DEFAULT 0 CHECK (commission_amount >= 0),
    bonus_amount DECIMAL(10, 2) DEFAULT 0 CHECK (bonus_amount >= 0),
    deduction_amount DECIMAL(10, 2) DEFAULT 0 CHECK (deduction_amount >= 0),
    total_amount DECIMAL(12, 2) NOT NULL CHECK (total_amount >= 0),
    
    -- Status
    status VARCHAR(20) DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Paid', 'Rejected')),
    approved_by VARCHAR(100),
    approved_at TIMESTAMP,
    paid_at TIMESTAMP,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    
    -- Metadata
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- Constraints
    CONSTRAINT valid_period CHECK (period_start <= period_end),
    CONSTRAINT valid_total_calculation CHECK (
        total_amount = (base_amount + commission_amount + bonus_amount - deduction_amount)
    )
);

CREATE INDEX IF NOT EXISTS payout_mitra_idx ON mitra_payout_db(mitra_id);
CREATE INDEX IF NOT EXISTS payout_period_idx ON mitra_payout_db(period_start, period_end);
CREATE INDEX IF NOT EXISTS payout_status_idx ON mitra_payout_db(status);

-- ====================================
-- TRIGGERS FOR AUTO-UPDATE TIMESTAMPS
-- ====================================

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to all tables
CREATE TRIGGER update_region_updated_at BEFORE UPDATE ON region_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subscription_package_updated_at BEFORE UPDATE ON subscription_package_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_updated_at BEFORE UPDATE ON customer_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mitra_updated_at BEFORE UPDATE ON mitra_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_updated_at BEFORE UPDATE ON invoice_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_schedule_updated_at BEFORE UPDATE ON attendance_schedule_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attendance_record_updated_at BEFORE UPDATE ON attendance_record_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_mitra_payout_updated_at BEFORE UPDATE ON mitra_payout_db 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================
-- AUTO-CALCULATE FUNCTIONS
-- ====================================

-- Function to calculate invoice total
CREATE OR REPLACE FUNCTION calculate_invoice_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount = NEW.subtotal + NEW.tax - NEW.discount;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_invoice_total_trigger
    BEFORE INSERT OR UPDATE OF subtotal, tax, discount ON invoice_db
    FOR EACH ROW EXECUTE FUNCTION calculate_invoice_total();

-- Function to calculate payout total
CREATE OR REPLACE FUNCTION calculate_payout_total()
RETURNS TRIGGER AS $$
BEGIN
    NEW.total_amount = NEW.base_amount + NEW.commission_amount + NEW.bonus_amount - NEW.deduction_amount;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER calculate_payout_total_trigger
    BEFORE INSERT OR UPDATE OF base_amount, commission_amount, bonus_amount, deduction_amount ON mitra_payout_db
    FOR EACH ROW EXECUTE FUNCTION calculate_payout_total();

-- Function to generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
        NEW.invoice_number = 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || LPAD(nextval('invoice_sequence')::TEXT, 4, '0');
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create sequence for invoice numbers
CREATE SEQUENCE IF NOT EXISTS invoice_sequence START 1;

CREATE TRIGGER generate_invoice_number_trigger
    BEFORE INSERT ON invoice_db
    FOR EACH ROW EXECUTE FUNCTION generate_invoice_number();

-- ====================================
-- VIEWS FOR COMMON QUERIES
-- ====================================

-- Customer with subscription details view
CREATE OR REPLACE VIEW customer_details_view AS
SELECT 
    c.id,
    c.no,
    c.customer_name,
    c.acquisition,
    c.contact,
    c.address,
    c.city,
    c.status,
    c.churn_tag,
    sp.package_name as subscription_package,
    sp.package_type,
    c.qty_package,
    c.ltv,
    c.first_date_subscription,
    m1.mitra_name as cleaner1_name,
    m2.mitra_name as cleaner2_name,
    c.created_at,
    c.updated_at
FROM customer_db c
LEFT JOIN subscription_package_db sp ON c.subscription_package_id = sp.id
LEFT JOIN mitra_db m1 ON c.cleaner1_id = m1.id
LEFT JOIN mitra_db m2 ON c.cleaner2_id = m2.id
WHERE c.is_deleted = FALSE;

-- Attendance records with customer and mitra details
CREATE OR REPLACE VIEW attendance_details_view AS
SELECT 
    ar.id,
    ar.no,
    ar.client_name,
    ar.address,
    ar.package,
    ar.start_date,
    ar.end_date,
    ar.new_end_date,
    ar.cleaner1,
    ar.cleaner2,
    ar.status,
    c.customer_name,
    m.mitra_name,
    ar.check_in_time,
    ar.check_out_time,
    ar.actual_duration,
    ar.work_quality,
    ar.created_at
FROM attendance_record_db ar
LEFT JOIN customer_db c ON ar.customer_id = c.id
LEFT JOIN mitra_db m ON ar.mitra_id = m.id
WHERE ar.is_deleted = FALSE;

-- ====================================
-- SAMPLE DATA (commented out - use seed script instead)
-- ====================================

/*
-- Sample regions
INSERT INTO region_db (region_name, province, city, district, postal_code) VALUES
('Jakarta Selatan', 'DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Baru', '12110'),
('Tangerang', 'Banten', 'Tangerang', 'Karawaci', '15810'),
('Bekasi', 'Jawa Barat', 'Bekasi', 'Bekasi Barat', '17134');

-- Sample subscription packages
INSERT INTO subscription_package_db (package_name, package_type, visits_per_week, price_per_visit, total_price) VALUES
('Regular Cleaning - Standard', 'Regular', 2, 50000, 400000),
('Frequent Cleaning - Intensive', 'Frequent', 3, 45000, 540000),
('Basic Cleaning - Economy', 'Basic', 1, 40000, 160000);
*/

-- ====================================
-- GRANTS (Adjust as needed for your user)
-- ====================================

-- Grant permissions to application user (replace 'app_user' with your actual username)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

COMMENT ON DATABASE CURRENT_DATABASE IS 'HOMA - Home Cleaning Management System Database';