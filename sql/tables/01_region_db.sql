-- Region Database Table
-- Master data for locations/regions

CREATE TABLE IF NOT EXISTS region_db (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    region_name VARCHAR(255) NOT NULL,
    province VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    village VARCHAR(100),
    postal_code VARCHAR(10) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for better query performance
    CONSTRAINT unique_region UNIQUE (city, district, village, postal_code)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_region_city ON region_db(city);
CREATE INDEX IF NOT EXISTS idx_region_district ON region_db(city, district);
CREATE INDEX IF NOT EXISTS idx_region_village ON region_db(city, district, village);
CREATE INDEX IF NOT EXISTS idx_region_postal ON region_db(postal_code);
CREATE INDEX IF NOT EXISTS idx_region_active ON region_db(is_active, is_deleted);

-- Trigger for auto-updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_region_db_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_region_db_updated_at ON region_db;
CREATE TRIGGER trigger_update_region_db_updated_at
    BEFORE UPDATE ON region_db
    FOR EACH ROW
    EXECUTE FUNCTION update_region_db_updated_at();

-- Insert master region data
INSERT INTO region_db (region_name, province, city, district, village, postal_code) VALUES
-- Jakarta Selatan
('Jakarta Selatan - Kebayoran Baru - Gandaria Utara', 'DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Baru', 'Gandaria Utara', '12140'),
('Jakarta Selatan - Kebayoran Baru - Gandaria Selatan', 'DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Baru', 'Gandaria Selatan', '12130'),
('Jakarta Selatan - Kebayoran Baru - Cipete Selatan', 'DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Baru', 'Cipete Selatan', '12410'),
('Jakarta Selatan - Kebayoran Baru - Senayan', 'DKI Jakarta', 'Jakarta Selatan', 'Kebayoran Baru', 'Senayan', '12190'),
('Jakarta Selatan - Tebet - Tebet Barat', 'DKI Jakarta', 'Jakarta Selatan', 'Tebet', 'Tebet Barat', '12810'),
('Jakarta Selatan - Tebet - Tebet Timur', 'DKI Jakarta', 'Jakarta Selatan', 'Tebet', 'Tebet Timur', '12820'),
('Jakarta Selatan - Mampang Prapatan - Mampang Prapatan', 'DKI Jakarta', 'Jakarta Selatan', 'Mampang Prapatan', 'Mampang Prapatan', '12790'),
('Jakarta Selatan - Pancoran - Pancoran', 'DKI Jakarta', 'Jakarta Selatan', 'Pancoran', 'Pancoran', '12780'),

-- Jakarta Pusat  
('Jakarta Pusat - Menteng - Menteng', 'DKI Jakarta', 'Jakarta Pusat', 'Menteng', 'Menteng', '10310'),
('Jakarta Pusat - Tanah Abang - Tanah Abang', 'DKI Jakarta', 'Jakarta Pusat', 'Tanah Abang', 'Tanah Abang', '10160'),
('Jakarta Pusat - Gambir - Gambir', 'DKI Jakarta', 'Jakarta Pusat', 'Gambir', 'Gambir', '10110'),
('Jakarta Pusat - Senen - Senen', 'DKI Jakarta', 'Jakarta Pusat', 'Senen', 'Senen', '10410'),

-- Jakarta Barat
('Jakarta Barat - Kebon Jeruk - Kebon Jeruk', 'DKI Jakarta', 'Jakarta Barat', 'Kebon Jeruk', 'Kebon Jeruk', '11530'),
('Jakarta Barat - Grogol Petamburan - Grogol', 'DKI Jakarta', 'Jakarta Barat', 'Grogol Petamburan', 'Grogol', '11460'),
('Jakarta Barat - Palmerah - Palmerah', 'DKI Jakarta', 'Jakarta Barat', 'Palmerah', 'Palmerah', '11480'),
('Jakarta Barat - Taman Sari - Taman Sari', 'DKI Jakarta', 'Jakarta Barat', 'Taman Sari', 'Taman Sari', '11150'),

-- Jakarta Utara
('Jakarta Utara - Kelapa Gading - Kelapa Gading Barat', 'DKI Jakarta', 'Jakarta Utara', 'Kelapa Gading', 'Kelapa Gading Barat', '14240'),
('Jakarta Utara - Kelapa Gading - Kelapa Gading Timur', 'DKI Jakarta', 'Jakarta Utara', 'Kelapa Gading', 'Kelapa Gading Timur', '14250'),
('Jakarta Utara - Pademangan - Pademangan Barat', 'DKI Jakarta', 'Jakarta Utara', 'Pademangan', 'Pademangan Barat', '14420'),
('Jakarta Utara - Penjaringan - Penjaringan', 'DKI Jakarta', 'Jakarta Utara', 'Penjaringan', 'Penjaringan', '14440'),

-- Jakarta Timur
('Jakarta Timur - Matraman - Matraman', 'DKI Jakarta', 'Jakarta Timur', 'Matraman', 'Matraman', '13150'),
('Jakarta Timur - Jatinegara - Jatinegara', 'DKI Jakarta', 'Jakarta Timur', 'Jatinegara', 'Jatinegara', '13210'),
('Jakarta Timur - Cakung - Cakung Barat', 'DKI Jakarta', 'Jakarta Timur', 'Cakung', 'Cakung Barat', '13910'),
('Jakarta Timur - Pulogadung - Pulogadung', 'DKI Jakarta', 'Jakarta Timur', 'Pulogadung', 'Pulogadung', '13260'),

-- Bogor
('Bogor - Bogor Tengah - Paledang', 'Jawa Barat', 'Bogor', 'Bogor Tengah', 'Paledang', '16122'),
('Bogor - Bogor Tengah - Sempur', 'Jawa Barat', 'Bogor', 'Bogor Tengah', 'Sempur', '16129'),
('Bogor - Bogor Utara - Tegal Lega', 'Jawa Barat', 'Bogor', 'Bogor Utara', 'Tegal Lega', '16153'),
('Bogor - Bogor Selatan - Mulyaharja', 'Jawa Barat', 'Bogor', 'Bogor Selatan', 'Mulyaharja', '16135'),
('Bogor - Bogor Barat - Cilendek Barat', 'Jawa Barat', 'Bogor', 'Bogor Barat', 'Cilendek Barat', '16112'),

-- Depok  
('Depok - Pancoran Mas - Pancoran Mas', 'Jawa Barat', 'Depok', 'Pancoran Mas', 'Pancoran Mas', '16431'),
('Depok - Beji - Beji', 'Jawa Barat', 'Depok', 'Beji', 'Beji', '16421'),
('Depok - Sukmajaya - Sukmajaya', 'Jawa Barat', 'Depok', 'Sukmajaya', 'Sukmajaya', '16412'),
('Depok - Cipayung - Cipayung', 'Jawa Barat', 'Depok', 'Cipayung', 'Cipayung', '16456'),
('Depok - Tapos - Tapos', 'Jawa Barat', 'Depok', 'Tapos', 'Tapos', '16457'),

-- Tangerang
('Tangerang - Karawaci - Karawaci', 'Banten', 'Tangerang', 'Karawaci', 'Karawaci', '15810'),
('Tangerang - Tangerang - Tangerang', 'Banten', 'Tangerang', 'Tangerang', 'Tangerang', '15111'),
('Tangerang - Cibodas - Cibodas', 'Banten', 'Tangerang', 'Cibodas', 'Cibodas', '15138'),
('Tangerang - Batuceper - Batuceper', 'Banten', 'Tangerang', 'Batuceper', 'Batuceper', '15122'),
('Tangerang - Neglasari - Neglasari', 'Banten', 'Tangerang', 'Neglasari', 'Neglasari', '15129'),

-- Tangerang Selatan
('Tangerang Selatan - Serpong - Serpong', 'Banten', 'Tangerang Selatan', 'Serpong', 'Serpong', '15310'),
('Tangerang Selatan - BSD - BSD', 'Banten', 'Tangerang Selatan', 'Serpong', 'BSD', '15321'),
('Tangerang Selatan - Pondok Aren - Pondok Aren', 'Banten', 'Tangerang Selatan', 'Pondok Aren', 'Pondok Aren', '15224'),
('Tangerang Selatan - Ciputat - Ciputat', 'Banten', 'Tangerang Selatan', 'Ciputat', 'Ciputat', '15411'),
('Tangerang Selatan - Pamulang - Pamulang', 'Banten', 'Tangerang Selatan', 'Pamulang', 'Pamulang', '15417'),

-- Bekasi
('Bekasi - Bekasi Barat - Jaka Sampurna', 'Jawa Barat', 'Bekasi', 'Bekasi Barat', 'Jaka Sampurna', '17145'),
('Bekasi - Bekasi Timur - Durenjaya', 'Jawa Barat', 'Bekasi', 'Bekasi Timur', 'Durenjaya', '17111'),
('Bekasi - Bekasi Selatan - Jaka Mulya', 'Jawa Barat', 'Bekasi', 'Bekasi Selatan', 'Jaka Mulya', '17146'),
('Bekasi - Bekasi Utara - Harapan Jaya', 'Jawa Barat', 'Bekasi', 'Bekasi Utara', 'Harapan Jaya', '17124'),
('Bekasi - Rawalumbu - Sepanjang Jaya', 'Jawa Barat', 'Bekasi', 'Rawalumbu', 'Sepanjang Jaya', '17117')

ON CONFLICT (city, district, village, postal_code) DO NOTHING;