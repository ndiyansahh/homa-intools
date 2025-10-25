-- Sample data for customerDB table (20 records)
-- Insert 20 customer records with realistic Indonesian data

INSERT INTO "customerDB" (
    "no",
    "customerName", 
    "acquisition",
    "contact",
    "address",
    "village",
    "district", 
    "city",
    "postalCode",
    "residentialType",
    "subscriptionPackage",
    "qtyPackage",
    "ltv",
    "firstDateSubscription",
    "status",
    "cleaner1",
    "cleaner2", 
    "churnTag",
    "churnReason",
    "isDeleted",
    "createdAt",
    "updatedAt"
) VALUES 
(1, 'Handi Sulyansah', 'HOMA', '62812916625948', '1 Park Residences', 'Gandaria', 'Kebayoran Baru', 'Jakarta Selatan', '15148', 'House', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 1, 4, '25/11/2022', 'Active', 'Ardi', 'Inem', 'N/A', '', false, '2022-11-25 10:00:00', '2022-11-25 10:00:00'),

(2, 'Sarah Wijaya', 'Altrix', '628123456789', 'Jl. Sudirman No. 45', 'Karet', 'Setiabudi', 'Jakarta Selatan', '12920', 'Apartment', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 2, 12, '15/12/2022', 'Active', 'Siti', 'Budi', 'N/A', '', false, '2022-12-15 10:30:00', '2022-12-15 10:30:00'),

(3, 'Michael Chen', 'HOMA', '628234567890', 'Komplek Villa Melati Mas', 'Serpong', 'Serpong Utara', 'Tangerang Selatan', '15310', 'House', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 1, 6, '20/12/2022', 'Active', 'Ani', 'Dewi', 'N/A', '', false, '2022-12-20 14:30:00', '2022-12-20 14:30:00'),

(4, 'Diana Rodriguez', 'Altrix', '628345678901', 'Gedung Perkantoran Thamrin', 'Menteng', 'Menteng', 'Jakarta Pusat', '10310', 'Office Space', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 1, 3, '10/01/2023', 'Churn', 'Rina', 'Tono', 'External', 'Pindah kantor', false, '2023-01-10 11:20:00', '2023-06-15 16:00:00'),

(5, 'Budi Santoso', 'HOMA', '628456789012', 'Perumahan Bintaro Jaya Sektor 9', 'Bintaro', 'Pondok Aren', 'Tangerang Selatan', '15229', 'House', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 1, 8, '05/02/2023', 'Active', 'Lilis', 'Agus', 'N/A', '', false, '2023-02-05 09:15:00', '2023-02-05 09:15:00'),

(6, 'Amanda Putri', 'Altrix', '628567890123', 'Apartemen Casablanca', 'Tebet', 'Tebet', 'Jakarta Selatan', '12870', 'Apartment', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 1, 15, '12/03/2023', 'Active', 'Wati', 'Joko', 'N/A', '', false, '2023-03-12 16:45:00', '2023-03-12 16:45:00'),

(7, 'Ricky Hakim', 'HOMA', '628678901234', 'Jl. Kemang Raya No. 88', 'Kemang', 'Mampang Prapatan', 'Jakarta Selatan', '12560', 'House', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 2, 5, '22/03/2023', 'Churn', 'Maya', 'Eko', 'Internal', 'Tidak puas dengan layanan', false, '2023-03-22 13:20:00', '2023-08-10 10:30:00'),

(8, 'Lisa Tan', 'Altrix', '628789012345', 'PIK Avenue Apartment', 'Kamal Muara', 'Penjaringan', 'Jakarta Utara', '14470', 'Apartment', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 1, 10, '18/04/2023', 'Active', 'Sari', 'Dedi', 'N/A', '', false, '2023-04-18 11:10:00', '2023-04-18 11:10:00'),

(9, 'Yoga Pratama', 'HOMA', '628890123456', 'Cluster Green Garden', 'Kebon Jeruk', 'Kebon Jeruk', 'Jakarta Barat', '11530', 'House', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 1, 4, '02/05/2023', 'Active', 'Indri', 'Bayu', 'N/A', '', false, '2023-05-02 08:30:00', '2023-05-02 08:30:00'),

(10, 'Stephanie Wong', 'Altrix', '628901234567', 'Office Park Kelapa Gading', 'Kelapa Gading', 'Kelapa Gading', 'Jakarta Utara', '14240', 'Office Space', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 2, 18, '25/05/2023', 'Active', 'Fitri', 'Heru', 'N/A', '', false, '2023-05-25 14:20:00', '2023-05-25 14:20:00'),

(11, 'Andi Prasetyo', 'HOMA', '629012345678', 'Perumahan Alam Sutera', 'Alam Sutera', 'Serpong', 'Tangerang Selatan', '15143', 'House', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 1, 3, '15/06/2023', 'Churn', 'Nita', 'Rudi', 'External', 'Pindah rumah', false, '2023-06-15 10:45:00', '2023-09-20 15:30:00'),

(12, 'Grace Lim', 'Altrix', '629123456789', 'Apartemen Senayan Residence', 'Senayan', 'Kebayoran Baru', 'Jakarta Selatan', '12190', 'Apartment', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 1, 7, '08/07/2023', 'Active', 'Yani', 'Adi', 'N/A', '', false, '2023-07-08 12:15:00', '2023-07-08 12:15:00'),

(13, 'Fajar Nugraha', 'HOMA', '629234567890', 'Jl. Puri Indah Raya', 'Puri Indah', 'Kembangan', 'Jakarta Barat', '11610', 'House', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 2, 6, '30/07/2023', 'Active', 'Ratna', 'Surya', 'N/A', '', false, '2023-07-30 09:30:00', '2023-07-30 09:30:00'),

(14, 'Catherine Lee', 'Altrix', '629345678901', 'Menara BCA', 'Thamrin', 'Menteng', 'Jakarta Pusat', '10340', 'Office Space', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 1, 14, '20/08/2023', 'Active', 'Vina', 'Andre', 'N/A', '', false, '2023-08-20 15:45:00', '2023-08-20 15:45:00'),

(15, 'Denny Kurniawan', 'HOMA', '629456789012', 'Vila Duta Mas', 'Duta Mas', 'Ciputat', 'Tangerang Selatan', '15412', 'House', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 1, 2, '10/09/2023', 'Pending', 'Lina', '', 'N/A', '', false, '2023-09-10 11:00:00', '2023-09-10 11:00:00'),

(16, 'Monica Tan', 'Altrix', '629567890123', 'Kuningan City Apartment', 'Kuningan', 'Setiabudi', 'Jakarta Selatan', '12940', 'Apartment', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 1, 9, '05/10/2023', 'Active', 'Eka', 'Imam', 'N/A', '', false, '2023-10-05 13:30:00', '2023-10-05 13:30:00'),

(17, 'Arief Rahman', 'HOMA', '629678901234', 'Perumahan Pantai Indah Kapuk', 'Pantai Indah Kapuk', 'Penjaringan', 'Jakarta Utara', '14460', 'House', 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)', 2, 16, '28/10/2023', 'Active', 'Dewi', 'Wahyu', 'N/A', '', false, '2023-10-28 16:20:00', '2023-10-28 16:20:00'),

(18, 'Jennifer Kim', 'Altrix', '629789012345', 'SCBD Suites', 'Senayan', 'Kebayoran Baru', 'Jakarta Selatan', '12190', 'Office Space', 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)', 1, 5, '15/11/2023', 'Churn', 'Tari', 'Bima', 'Internal', 'Budget terbatas', false, '2023-11-15 14:10:00', '2024-02-28 09:45:00'),

(19, 'Wawan Setiawan', 'HOMA', '629890123456', 'Cluster Harapan Indah', 'Harapan Indah', 'Bekasi Utara', 'Bekasi', '17124', 'House', 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)', 1, 1, '12/12/2023', 'Active', 'Mira', 'Fandi', 'N/A', '', false, '2023-12-12 10:25:00', '2023-12-12 10:25:00'),

(20, 'Natasha Sari', 'Altrix', '629901234567', 'Apartment Gold Coast', 'Pantai Indah Kapuk', 'Penjaringan', 'Jakarta Utara', '14470', 'Apartment', 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)', 1, 11, '08/01/2024', 'Active', 'Putri', 'Joni', 'N/A', '', false, '2024-01-08 12:50:00', '2024-01-08 12:50:00');