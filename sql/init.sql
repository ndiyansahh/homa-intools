-- HOMA Database initialization script
-- This script initializes the complete database schema by running individual table files

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'Asia/Jakarta';

-- Create database tables in dependency order

-- 1. Region Database (Master data - no dependencies)
\i sql/tables/01_region_db.sql

-- 2. Subscription Package Database (Master data - no dependencies) 
\i sql/tables/02_subscription_package_db.sql

-- 3. Customer Database (depends on subscription_package_db)
\i sql/tables/03_customer_db.sql

-- 4. Mitra Database (Master data - no dependencies)
\i sql/tables/04_mitra_db.sql

-- 5. Invoice Database (depends on customer_db)
\i sql/tables/05_invoice_db.sql

-- 6. Attendance Schedule Database (depends on customer_db, mitra_db)
\i sql/tables/06_attendance_schedule_db.sql

-- 7. Attendance Record Database (depends on attendance_schedule_db, customer_db, mitra_db)
\i sql/tables/07_attendance_record_db.sql

-- 8. Mitra Payout Database (depends on mitra_db, calculated from attendance_record_db)
\i sql/tables/08_mitra_payout_db.sql

-- Create additional utility views and functions
CREATE OR REPLACE VIEW active_customers AS
SELECT * FROM customer_db 
WHERE is_active = true AND is_deleted = false;

CREATE OR REPLACE VIEW active_mitras AS  
SELECT * FROM mitra_db
WHERE is_active = true AND is_deleted = false;

CREATE OR REPLACE VIEW pending_invoices AS
SELECT * FROM invoice_db
WHERE status IN ('Pending', 'Overdue') AND is_deleted = false;

CREATE OR REPLACE VIEW today_schedule AS
SELECT 
    asd.*,
    cd.contact as customer_contact,
    md.contact as mitra_contact
FROM attendance_schedule_db asd
JOIN customer_db cd ON asd.customer_id = cd.id
JOIN mitra_db md ON asd.mitra_id = md.id
WHERE asd.scheduled_date = CURRENT_DATE
AND asd.status IN ('Scheduled', 'In Progress')
AND asd.is_deleted = false;

-- Grant permissions (adjust user as needed)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO homa_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO homa_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO homa_user;

-- Create sample data insertion function
CREATE OR REPLACE FUNCTION insert_sample_data()
RETURNS void AS $$
BEGIN
    RAISE NOTICE 'Sample data can be inserted using: npm run db:seed';
    RAISE NOTICE 'Or manually by running: tsx scripts/seed.ts';
END;
$$ LANGUAGE plpgsql;

-- Database initialization completed
SELECT 'HOMA Database initialization completed successfully!' as status;