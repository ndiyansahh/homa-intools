-- =====================================================
-- TEST DATA INSERT SCRIPTS - MITRA PAYOUT TESTING
-- Period: January 2025
-- Requirements: 1a, 1b, 1c
-- =====================================================

-- Note: Replace UUIDs with actual IDs from your database
-- This script assumes you already have subscription_package_db populated

-- =====================================================
-- 1. INSERT MITRAS (if not exists)
-- =====================================================
INSERT INTO mitra_db (
  id,
  mitra_name,
  mitra_code,
  is_active,
  base_rate,
  monthly_base_rate,
  created_at
) VALUES
  ('mitra-a-uuid', 'Jane Doe', 'MIT-001', true, '100000', '900000', NOW()),
  ('mitra-b-uuid', 'John Smith', 'MIT-002', true, '100000', '700000', NOW()),
  ('mitra-c-uuid', 'Sarah Lee', 'MIT-003', true, '100000', '600000', NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. INSERT RATE CONFIGURATIONS
-- =====================================================
-- Get subscription package IDs first:
-- SELECT id, subscription_package FROM subscription_package_db;

-- Jane Doe (MITRA-A) - Rate Configs
INSERT INTO mitra_rate_config_db (
  id,
  mitra_id,
  subscription_package_id,
  monthly_rate,
  effective_from,
  effective_to,
  is_active,
  created_at,
  created_by,
  notes
) VALUES
  -- Jane - Basic Package
  (gen_random_uuid(), 'mitra-a-uuid', 'basic-pkg-uuid', '800000', '2025-01-01', NULL, true, NOW(), 'test', 'Jane rate for Basic customers'),
  -- Jane - Regular Package
  (gen_random_uuid(), 'mitra-a-uuid', 'regular-pkg-uuid', '1000000', '2025-01-01', NULL, true, NOW(), 'test', 'Jane rate for Regular customers'),
  -- Jane - Frequent Package
  (gen_random_uuid(), 'mitra-a-uuid', 'frequent-pkg-uuid', '1200000', '2025-01-01', NULL, true, NOW(), 'test', 'Jane rate for Frequent customers');

-- John Smith (MITRA-B) - Rate Configs
INSERT INTO mitra_rate_config_db (
  id,
  mitra_id,
  subscription_package_id,
  monthly_rate,
  effective_from,
  effective_to,
  is_active,
  created_at,
  created_by,
  notes
) VALUES
  -- John - Basic Package (DIFFERENT from Jane!)
  (gen_random_uuid(), 'mitra-b-uuid', 'basic-pkg-uuid', '700000', '2025-01-01', NULL, true, NOW(), 'test', 'John rate for Basic - lower than Jane'),
  -- John - Regular Package
  (gen_random_uuid(), 'mitra-b-uuid', 'regular-pkg-uuid', '900000', '2025-01-01', NULL, true, NOW(), 'test', 'John rate for Regular customers'),
  -- John - Frequent Package
  (gen_random_uuid(), 'mitra-b-uuid', 'frequent-pkg-uuid', '1000000', '2025-01-01', NULL, true, NOW(), 'test', 'John rate for Frequent customers');

-- Sarah Lee (MITRA-C) - Default Rate Only (no package-specific config)
INSERT INTO mitra_rate_config_db (
  id,
  mitra_id,
  subscription_package_id,
  monthly_rate,
  effective_from,
  effective_to,
  is_active,
  created_at,
  created_by,
  notes
) VALUES
  (gen_random_uuid(), 'mitra-c-uuid', NULL, '600000', '2025-01-01', NULL, true, NOW(), 'test', 'Sarah default rate - no package config');

-- =====================================================
-- 3. INSERT CUSTOMERS (if not exists)
-- =====================================================
INSERT INTO customer_db (
  id,
  customer_name,
  subscription_package_id,
  subscription_package,
  address,
  contact,
  subscription_start,
  subscription_qty,
  subscription_per_qty,
  is_active,
  created_at
) VALUES
  ('cust-001-uuid', 'PT Maju Jaya', 'basic-pkg-uuid', 'Basic Package (2x/week)', 'Jl. Sudirman No. 1', '081234567001', '2024-01-01', 8, '100000', true, NOW()),
  ('cust-002-uuid', 'CV Sejahtera', 'frequent-pkg-uuid', 'Frequent Package (3x/week)', 'Jl. Thamrin No. 2', '081234567002', '2024-01-01', 12, '150000', true, NOW()),
  ('cust-003-uuid', 'Toko Sumber Rejeki', 'basic-pkg-uuid', 'Basic Package (2x/week)', 'Jl. Gatot Subroto No. 3', '081234567003', '2024-01-01', 8, '100000', true, NOW()),
  ('cust-004-uuid', 'PT Indo Foods', 'regular-pkg-uuid', 'Regular Package (3x/week)', 'Jl. Rasuna Said No. 4', '081234567004', '2024-01-01', 12, '120000', true, NOW()),
  ('cust-005-uuid', 'Rumah Pak Budi', 'basic-pkg-uuid', 'Basic Package (2x/week)', 'Jl. Kuningan No. 5', '081234567005', '2024-01-01', 8, '100000', true, NOW())
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. INSERT VISITS - JANUARY 2025
-- =====================================================

-- CUSTOMER 1: PT Maju Jaya (MITRA-A, Basic, 8/8 visits = 100%)
INSERT INTO visit_db (id, customer_id, mitra_id, actual_mitra_id, scheduled_date, status, completed_at, created_at) VALUES
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-02', 'Done', '2025-01-02 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-06', 'Done', '2025-01-06 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-09', 'Done', '2025-01-09 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-13', 'Done', '2025-01-13 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-16', 'Done', '2025-01-16 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-20', 'Done', '2025-01-20 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-23', 'Done', '2025-01-23 09:00:00', NOW()),
  (gen_random_uuid(), 'cust-001-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-27', 'Done', '2025-01-27 09:00:00', NOW());

-- CUSTOMER 2: CV Sejahtera (MITRA-A, Frequent, 9/12 visits = 75%)
INSERT INTO visit_db (id, customer_id, mitra_id, actual_mitra_id, scheduled_date, status, completed_at, created_at) VALUES
  -- Completed (9)
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-02', 'Done', '2025-01-02 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-06', 'Done', '2025-01-06 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-09', 'Done', '2025-01-09 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-13', 'Done', '2025-01-13 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-16', 'Done', '2025-01-16 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-20', 'Done', '2025-01-20 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-23', 'Done', '2025-01-23 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-27', 'Done', '2025-01-27 14:00:00', NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-30', 'Done', '2025-01-30 14:00:00', NOW()),
  -- Missed (3)
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-03', 'Missed', NULL, NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-10', 'Missed', NULL, NOW()),
  (gen_random_uuid(), 'cust-002-uuid', 'mitra-a-uuid', 'mitra-a-uuid', '2025-01-17', 'Missed', NULL, NOW());

-- CUSTOMER 3: Toko Sumber Rejeki (MITRA-B, Basic, 8/8 visits = 100%)
INSERT INTO visit_db (id, customer_id, mitra_id, actual_mitra_id, scheduled_date, status, completed_at, created_at) VALUES
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-03', 'Done', '2025-01-03 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-07', 'Done', '2025-01-07 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-10', 'Done', '2025-01-10 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-14', 'Done', '2025-01-14 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-17', 'Done', '2025-01-17 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-21', 'Done', '2025-01-21 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-24', 'Done', '2025-01-24 10:00:00', NOW()),
  (gen_random_uuid(), 'cust-003-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-28', 'Done', '2025-01-28 10:00:00', NOW());

-- CUSTOMER 4: PT Indo Foods (MITRA-B, Regular, 9/12 visits = 75%)
INSERT INTO visit_db (id, customer_id, mitra_id, actual_mitra_id, scheduled_date, status, completed_at, created_at) VALUES
  -- Completed (9)
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-02', 'Done', '2025-01-02 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-06', 'Done', '2025-01-06 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-09', 'Done', '2025-01-09 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-13', 'Done', '2025-01-13 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-16', 'Done', '2025-01-16 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-20', 'Done', '2025-01-20 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-23', 'Done', '2025-01-23 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-27', 'Done', '2025-01-27 13:00:00', NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-30', 'Done', '2025-01-30 13:00:00', NOW()),
  -- Missed (3)
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-03', 'Missed', NULL, NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-10', 'Missed', NULL, NOW()),
  (gen_random_uuid(), 'cust-004-uuid', 'mitra-b-uuid', 'mitra-b-uuid', '2025-01-17', 'Missed', NULL, NOW());

-- CUSTOMER 5: Rumah Pak Budi (MITRA-C, Basic, 8/8 visits = 100%)
INSERT INTO visit_db (id, customer_id, mitra_id, actual_mitra_id, scheduled_date, status, completed_at, created_at) VALUES
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-04', 'Done', '2025-01-04 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-08', 'Done', '2025-01-08 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-11', 'Done', '2025-01-11 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-15', 'Done', '2025-01-15 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-18', 'Done', '2025-01-18 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-22', 'Done', '2025-01-22 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-25', 'Done', '2025-01-25 08:00:00', NOW()),
  (gen_random_uuid(), 'cust-005-uuid', 'mitra-c-uuid', 'mitra-c-uuid', '2025-01-29', 'Done', '2025-01-29 08:00:00', NOW());

-- =====================================================
-- 5. VERIFICATION QUERIES
-- =====================================================

-- Count visits per customer
SELECT
  c.customer_name,
  COUNT(*) as total_visits,
  SUM(CASE WHEN v.status = 'Done' THEN 1 ELSE 0 END) as completed,
  SUM(CASE WHEN v.status = 'Missed' THEN 1 ELSE 0 END) as missed
FROM visit_db v
JOIN customer_db c ON v.customer_id = c.id
WHERE v.scheduled_date >= '2025-01-01' AND v.scheduled_date <= '2025-01-31'
GROUP BY c.customer_name;

-- Check rate configurations
SELECT
  m.mitra_name,
  sp.subscription_package,
  rc.monthly_rate,
  rc.is_active
FROM mitra_rate_config_db rc
JOIN mitra_db m ON rc.mitra_id = m.id
LEFT JOIN subscription_package_db sp ON rc.subscription_package_id = sp.id
ORDER BY m.mitra_name, sp.subscription_package;

-- Expected payout calculation (manual check)
SELECT
  m.mitra_name,
  c.customer_name,
  c.subscription_package,
  COUNT(v.id) FILTER (WHERE v.status = 'Done') as completed_visits,
  COUNT(v.id) as scheduled_visits,
  rc.monthly_rate,
  ROUND((COUNT(v.id) FILTER (WHERE v.status = 'Done')::numeric / COUNT(v.id)::numeric) * rc.monthly_rate::numeric, 2) as expected_payout
FROM visit_db v
JOIN customer_db c ON v.customer_id = c.id
JOIN mitra_db m ON v.actual_mitra_id = m.id
LEFT JOIN mitra_rate_config_db rc ON rc.mitra_id = m.id
  AND (rc.subscription_package_id = c.subscription_package_id OR rc.subscription_package_id IS NULL)
  AND rc.is_active = true
WHERE v.scheduled_date >= '2025-01-01' AND v.scheduled_date <= '2025-01-31'
GROUP BY m.mitra_name, c.customer_name, c.subscription_package, rc.monthly_rate
ORDER BY m.mitra_name, c.customer_name;
