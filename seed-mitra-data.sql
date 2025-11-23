-- Seed Data: 20 Mitra dengan Coverage All Assignment Areas
-- Indonesian names, various cities, partnership types, and statuses

INSERT INTO mitra_db (
  mitra_name, mitra_code, mitra_nik, mitra_gender, mitra_dob, mitra_phone,
  address, city, district, postal_code,
  mitra_bank_account, mitra_bank_holder_name, mitra_bank_account_number,
  mitra_city_assignment, mitra_location_assignment,
  mitra_partnership, mitra_tenure, mitra_bonus_commission,
  status, base_rate, join_date
) VALUES
-- Jakarta Selatan Team
('Siti Nurhaliza', 'MITRA-202501-001', '3174015501950001', 'Female', '01/15/1995', '081234567801',
 'Jl. Haji Nawi No. 12, Kebayoran Baru', 'Jakarta Selatan', 'Kebayoran Baru', '12130',
 'BCA', 'Siti Nurhaliza', '1234567801',
 'Jakarta Selatan', '["Kebayoran Baru", "Senayan", "Pondok Indah"]',
 'Full Time', 24, 'Eligible',
 'Active', 150000, '2023-01-15'),

('Budi Santoso', 'MITRA-202501-002', '3174012208920002', 'Male', '08/22/1992', '081234567802',
 'Jl. Radio Dalam Raya No. 45, Gandaria', 'Jakarta Selatan', 'Gandaria', '12140',
 'Mandiri', 'Budi Santoso', '9876543202',
 'Jakarta Selatan', '["Gandaria", "Cilandak", "Lebak Bulus"]',
 'Full Time', 18, 'Eligible',
 'Active', 150000, '2023-07-10'),

('Rina Wulandari', 'MITRA-202502-003', '3174016603880003', 'Female', '03/26/1988', '081234567803',
 'Jl. Fatmawati No. 88, Fatmawati', 'Jakarta Selatan', 'Fatmawati', '12150',
 'BRI', 'Rina Wulandari', '5678901203',
 'Jakarta Selatan', '["Fatmawati", "TB Simatupang", "Pasar Minggu"]',
 'Part Time', 12, 'Not Eligible',
 'Active', 120000, '2024-02-01'),

-- Jakarta Pusat Team
('Ahmad Fauzi', 'MITRA-202503-004', '3171011505890004', 'Male', '05/15/1989', '081234567804',
 'Jl. Cikini Raya No. 23, Menteng', 'Jakarta Pusat', 'Menteng', '10330',
 'BCA', 'Ahmad Fauzi', '2345678904',
 'Jakarta Pusat', '["Menteng", "Tanah Abang", "Sudirman"]',
 'Full Time', 30, 'Eligible',
 'Active', 150000, '2022-03-20'),

('Dewi Lestari', 'MITRA-202504-005', '3171015209910005', 'Female', '09/12/1991', '081234567805',
 'Jl. Kebon Sirih No. 67, Kebon Sirih', 'Jakarta Pusat', 'Kebon Sirih', '10340',
 'Mandiri', 'Dewi Lestari', '8765432105',
 'Jakarta Pusat', '["Kebon Sirih", "Gambir", "Kemayoran"]',
 'Full Time', 20, 'Eligible',
 'Active', 150000, '2023-04-12'),

('Hendra Gunawan', 'MITRA-202505-006', '3171012011870006', 'Male', '11/20/1987', '081234567806',
 'Jl. Thamrin No. 156, Thamrin', 'Jakarta Pusat', 'Thamrin', '10350',
 'BRI', 'Hendra Gunawan', '4567890106',
 'Jakarta Pusat', '["Thamrin", "Kuningan", "Setiabudi"]',
 'Part Time', 8, 'Not Eligible',
 'Active-Flag', 120000, '2024-05-01'),

-- Tangerang Team
('Ani Yulianti', 'MITRA-202506-007', '3671014408930007', 'Female', '08/04/1993', '081234567807',
 'Jl. BSD Boulevard No. 12, BSD', 'Tangerang Selatan', 'BSD', '15310',
 'BCA', 'Ani Yulianti', '3456789007',
 'Tangerang Selatan', '["BSD", "Alam Sutera", "Serpong"]',
 'Full Time', 15, 'Eligible',
 'Active', 150000, '2023-06-15'),

('Rudi Hartono', 'MITRA-202507-008', '3671011203900008', 'Male', '03/12/1990', '081234567808',
 'Jl. Gading Serpong No. 45, Gading Serpong', 'Tangerang', 'Gading Serpong', '15810',
 'Mandiri', 'Rudi Hartono', '6789012308',
 'Tangerang', '["Gading Serpong", "Citra Raya", "Karawaci"]',
 'Full Time', 22, 'Eligible',
 'Active', 150000, '2023-01-20'),

('Yuni Kartika', 'MITRA-202508-009', '3671015507940009', 'Female', '07/15/1994', '081234567809',
 'Jl. Bintaro Jaya No. 78, Bintaro', 'Tangerang Selatan', 'Bintaro', '15220',
 'BRI', 'Yuni Kartika', '9012345609',
 'Tangerang Selatan', '["Bintaro", "Pondok Aren", "Pamulang"]',
 'Part Time', 10, 'Not Eligible',
 'Active', 120000, '2024-08-01'),

-- Bekasi Team
('Agus Setiawan', 'MITRA-202509-010', '3275011109880010', 'Male', '09/11/1988', '081234567810',
 'Jl. Harapan Indah No. 34, Harapan Indah', 'Bekasi', 'Harapan Indah', '17131',
 'BCA', 'Agus Setiawan', '1234509810',
 'Bekasi', '["Harapan Indah", "Summarecon Bekasi", "Galaxy"]',
 'Full Time', 28, 'Eligible',
 'Active', 150000, '2022-09-10'),

('Sri Rahayu', 'MITRA-202510-011', '3275016602920011', 'Female', '02/26/1992', '081234567811',
 'Jl. Kemang Pratama No. 56, Kemang Pratama', 'Bekasi', 'Kemang Pratama', '17116',
 'Mandiri', 'Sri Rahayu', '5678901211',
 'Bekasi', '["Kemang Pratama", "Grand Wisata", "Cibubur"]',
 'Full Time', 16, 'Eligible',
 'Active', 150000, '2023-10-15'),

('Dedi Kurniawan', 'MITRA-202511-012', '3275013008860012', 'Male', '08/30/1986', '081234567812',
 'Jl. Pekayon No. 90, Pekayon', 'Bekasi', 'Pekayon', '17148',
 'BRI', 'Dedi Kurniawan', '9012345612',
 'Bekasi', '["Pekayon", "Jatibening", "Pondok Gede"]',
 'Part Time', 6, 'Not Eligible',
 'Active', 120000, '2024-11-01'),

-- Bogor Team
('Lia Permata', 'MITRA-202512-013', '3271014501910013', 'Female', '01/05/1991', '081234567813',
 'Jl. Pajajaran No. 123, Bogor Tengah', 'Bogor', 'Bogor Tengah', '16143',
 'BCA', 'Lia Permata', '2345678913',
 'Bogor', '["Bogor Tengah", "Bogor Utara", "Bogor Timur"]',
 'Full Time', 19, 'Eligible',
 'Active', 150000, '2023-12-05'),

('Bambang Wijaya', 'MITRA-202601-014', '3271012209890014', 'Male', '09/22/1989', '081234567814',
 'Jl. Sentul City No. 45, Sentul', 'Bogor', 'Sentul', '16810',
 'Mandiri', 'Bambang Wijaya', '6789012314',
 'Bogor', '["Sentul", "Cibinong", "Gunung Putri"]',
 'Full Time', 25, 'Eligible',
 'Active', 150000, '2022-01-18'),

('Fitri Handayani', 'MITRA-202602-015', '3271016803950015', 'Female', '03/28/1995', '081234567815',
 'Jl. Cibinong No. 67, Cibinong', 'Bogor', 'Cibinong', '16914',
 'BRI', 'Fitri Handayani', '8901234515',
 'Bogor', '["Cibinong", "Cileungsi", "Jonggol"]',
 'Part Time', 7, 'Not Eligible',
 'Active', 120000, '2024-02-20'),

-- Depok Team
('Eko Prasetyo', 'MITRA-202603-016', '3276011104870016', 'Male', '04/11/1987', '081234567816',
 'Jl. Margonda Raya No. 234, Depok', 'Depok', 'Depok', '16431',
 'BCA', 'Eko Prasetyo', '3456789016',
 'Depok', '["Margonda", "UI", "Beji"]',
 'Full Time', 32, 'Eligible',
 'Active', 150000, '2021-03-15'),

('Nina Anggraini', 'MITRA-202604-017', '3276015506930017', 'Female', '06/15/1993', '081234567817',
 'Jl. Cinere Raya No. 89, Cinere', 'Depok', 'Cinere', '16514',
 'Mandiri', 'Nina Anggraini', '7890123417',
 'Depok', '["Cinere", "Limo", "Pancoran Mas"]',
 'Full Time', 14, 'Eligible',
 'Active', 150000, '2024-04-10'),

('Joko Susilo', 'MITRA-202605-018', '3276012708880018', 'Male', '08/27/1988', '081234567818',
 'Jl. Sawangan No. 45, Sawangan', 'Depok', 'Sawangan', '16516',
 'BRI', 'Joko Susilo', '1234567818',
 'Depok', '["Sawangan", "Bojongsari", "Cipayung"]',
 'Part Time', 9, 'Not Eligible',
 'Active-Flag', 120000, '2024-05-22'),

-- Exit Status Examples
('Tina Suryani', 'MITRA-202606-019', '3174016609900019', 'Female', '09/26/1990', '081234567819',
 'Jl. Melawai No. 67, Melawai', 'Jakarta Selatan', 'Melawai', '12160',
 'BCA', 'Tina Suryani', '5678901219',
 'Jakarta Selatan', '["Melawai", "Blok M", "Dharmawangsa"]',
 'Full Time', 36, 'Eligible',
 'Exit', 150000, '2021-06-01'),

('Wawan Setiadi', 'MITRA-202607-020', '3175011203910020', 'Male', '03/12/1991', '081234567820',
 'Jl. Kelapa Gading No. 123, Kelapa Gading', 'Jakarta Utara', 'Kelapa Gading', '14240',
 'Mandiri', 'Wawan Setiadi', '9012345620',
 'Jakarta Utara', '["Kelapa Gading", "Sunter", "Ancol"]',
 'Full Time', 12, 'Not Eligible',
 'Exit', 150000, '2023-07-15');

-- Verify data inserted
SELECT COUNT(*) as total_mitra FROM mitra_db;
SELECT mitra_city_assignment, COUNT(*) as count
FROM mitra_db
GROUP BY mitra_city_assignment
ORDER BY count DESC;
