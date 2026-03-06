-- Sample data for customer_db table (20 records)
-- Updated to match actual database schema

INSERT INTO customer_db (
    customer_name,
    contact,
    address,
    city,
    district,
    village,
    postal_code,
    subscription_package,
    subscription_start,
    subscription_end,
    subscription_status,
    monthly_fee,
    total_paid,
    outstanding_balance,
    customer_notes,
    is_active,
    is_deleted
) VALUES 
('Handi Sulyansah', '62812916625948', '1 Park Residences', 'Jakarta Selatan', 'Kebayoran Baru', 'Gandaria', '15148', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', '2022-11-25', '2024-11-25', 'Active', 1500000, 18000000, 0, 'Customer utama HOMA', true, false),

('Sarah Wijaya', '628123456789', 'Jl. Sudirman No. 45', 'Jakarta Selatan', 'Setiabudi', 'Karet', '12920', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', '2022-12-15', '2024-12-15', 'Active', 2200000, 26400000, 0, 'Client Altrix premium', true, false),

('Michael Chen', '628234567890', 'Komplek Villa Melati Mas', 'Tangerang Selatan', 'Serpong Utara', 'Serpong', '15310', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', '2022-12-20', '2024-12-20', 'Active', 900000, 10800000, 0, 'Rumah besar butuh cleaning basic', true, false),

('Diana Rodriguez', '628345678901', 'Gedung Perkantoran Thamrin', 'Jakarta Pusat', 'Menteng', 'Menteng', '10310', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', '2023-01-10', '2023-06-10', 'Inactive', 750000, 4500000, 0, 'Churn - pindah kantor', false, false),

('Budi Santoso', '628456789012', 'Perumahan Bintaro Jaya Sektor 9', 'Tangerang Selatan', 'Pondok Aren', 'Bintaro', '15229', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', '2023-02-05', '2025-02-05', 'Active', 1500000, 15000000, 0, 'Client loyal HOMA', true, false),

('Amanda Putri', '628567890123', 'Apartemen Casablanca', 'Jakarta Selatan', 'Tebet', 'Tebet', '12870', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', '2023-03-12', '2025-03-12', 'Active', 2200000, 22000000, 0, 'Apartment premium service', true, false),

('Ricky Hakim', '628678901234', 'Jl. Kemang Raya No. 88', 'Jakarta Selatan', 'Mampang Prapatan', 'Kemang', '12560', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', '2023-03-22', '2023-08-22', 'Inactive', 900000, 4500000, 900000, 'Churn - tidak puas layanan', false, false),

('Lisa Tan', '628789012345', 'PIK Avenue Apartment', 'Jakarta Utara', 'Penjaringan', 'Kamal Muara', '14470', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', '2023-04-18', '2025-04-18', 'Active', 1500000, 12000000, 0, 'Client Altrix apartment', true, false),

('Yoga Pratama', '628890123456', 'Cluster Green Garden', 'Jakarta Barat', 'Kebon Jeruk', 'Kebon Jeruk', '11530', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', '2023-05-02', '2025-05-02', 'Active', 750000, 6750000, 0, 'Partnership special rate', true, false),

('Stephanie Wong', '628901234567', 'Office Park Kelapa Gading', 'Jakarta Utara', 'Kelapa Gading', 'Kelapa Gading', '14240', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', '2023-05-25', '2025-05-25', 'Active', 2200000, 17600000, 0, 'Office cleaning premium', true, false),

('Andi Prasetyo', '629012345678', 'Perumahan Alam Sutera', 'Tangerang Selatan', 'Serpong', 'Alam Sutera', '15143', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', '2023-06-15', '2023-09-15', 'Inactive', 900000, 2700000, 0, 'Churn - pindah rumah', false, false),

('Grace Lim', '629123456789', 'Apartemen Senayan Residence', 'Jakarta Selatan', 'Kebayoran Baru', 'Senayan', '12190', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', '2023-07-08', '2025-07-08', 'Active', 1500000, 9000000, 0, 'Apartment Senayan premium', true, false),

('Fajar Nugraha', '629234567890', 'Jl. Puri Indah Raya', 'Jakarta Barat', 'Kembangan', 'Puri Indah', '11610', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', '2023-07-30', '2025-07-30', 'Active', 750000, 6000000, 0, 'Double package special', true, false),

('Catherine Lee', '629345678901', 'Menara BCA', 'Jakarta Pusat', 'Menteng', 'Thamrin', '10340', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', '2023-08-20', '2025-08-20', 'Active', 2200000, 13200000, 0, 'Corporate office cleaning', true, false),

('Denny Kurniawan', '629456789012', 'Vila Duta Mas', 'Tangerang Selatan', 'Ciputat', 'Duta Mas', '15412', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', '2023-09-10', '2025-09-10', 'Active', 900000, 3600000, 0, 'New customer trial period', true, false),

('Monica Tan', '629567890123', 'Kuningan City Apartment', 'Jakarta Selatan', 'Setiabudi', 'Kuningan', '12940', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', '2023-10-05', '2025-10-05', 'Active', 1500000, 6000000, 0, 'Premium apartment service', true, false),

('Arief Rahman', '629678901234', 'Perumahan Pantai Indah Kapuk', 'Jakarta Utara', 'Penjaringan', 'Pantai Indah Kapuk', '14460', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', '2023-10-28', '2025-10-28', 'Active', 2200000, 6600000, 0, 'Large house frequent cleaning', true, false),

('Jennifer Kim', '629789012345', 'SCBD Suites', 'Jakarta Selatan', 'Kebayoran Baru', 'Senayan', '12190', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', '2023-11-15', '2024-02-15', 'Inactive', 750000, 2250000, 750000, 'Churn - budget constraints', false, false),

('Wawan Setiawan', '629890123456', 'Cluster Harapan Indah', 'Bekasi', 'Bekasi Utara', 'Harapan Indah', '17124', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', '2023-12-12', '2025-12-12', 'Active', 900000, 1800000, 0, 'New area expansion', true, false),

('Natasha Sari', '629901234567', 'Apartment Gold Coast', 'Jakarta Utara', 'Penjaringan', 'Pantai Indah Kapuk', '14470', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', '2024-01-08', '2026-01-08', 'Active', 1500000, 1500000, 0, 'Latest customer premium apt', true, false);