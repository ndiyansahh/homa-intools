-- =====================================================
-- SHOW PAYOUT DATA FOR SRI RAHAYU, BUDI SANTOSO & ANI YULIANTI
-- September & October 2025
-- =====================================================

-- Detailed Payout Information
SELECT
  m.mitra_name AS "Nama Mitra",
  m.mitra_code AS "Kode Mitra",
  p.payout_id AS "Payout ID",
  CASE p.month
    WHEN 9 THEN 'September'
    WHEN 10 THEN 'October'
  END AS "Bulan",
  p.year AS "Tahun",
  p.payout_date AS "Tanggal Payout",
  p.total_visits AS "Total Kunjungan",
  'Rp ' || TO_CHAR(p.price_per_visit, 'FM999,999,999') AS "Harga per Kunjungan",
  'Rp ' || TO_CHAR(p.base_payout, 'FM999,999,999') AS "Base Payout",
  'Rp ' || TO_CHAR(p.bonus_amount, 'FM999,999,999') AS "Bonus",
  'Rp ' || TO_CHAR(p.total_payout, 'FM999,999,999') AS "Total Payout",
  p.bonus_eligible AS "Eligible Bonus",
  p.status AS "Status",
  p.notes AS "Catatan"
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.month IN (9, 10)
  AND p.year = 2025
ORDER BY m.mitra_name, p.month;

-- =====================================================
-- Summary Per Mitra untuk Sept & Oct 2025
-- =====================================================

SELECT
  m.mitra_name AS "Nama Mitra",
  COUNT(p.id) AS "Jumlah Bulan",
  SUM(p.total_visits) AS "Total Kunjungan",
  'Rp ' || TO_CHAR(SUM(p.base_payout), 'FM999,999,999') AS "Total Base Payout",
  'Rp ' || TO_CHAR(SUM(p.bonus_amount), 'FM999,999,999') AS "Total Bonus",
  'Rp ' || TO_CHAR(SUM(p.total_payout), 'FM999,999,999') AS "Grand Total",
  CASE WHEN BOOL_AND(p.bonus_eligible) THEN 'Ya' ELSE 'Tidak' END AS "Eligible Bonus"
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.month IN (9, 10)
  AND p.year = 2025
GROUP BY m.mitra_name
ORDER BY m.mitra_name;

-- =====================================================
-- Breakdown Visits per Customer untuk Sept & Oct 2025
-- =====================================================

SELECT
  m.mitra_name AS "Nama Mitra",
  c.customer_name AS "Nama Customer",
  TO_CHAR(v.actual_date, 'Month') AS "Bulan",
  COUNT(v.id) AS "Jumlah Kunjungan",
  'Rp ' || TO_CHAR(COUNT(v.id) * 150000, 'FM999,999,999') AS "Estimasi Earnings"
FROM mitra_db m
JOIN visit_db v ON v.mitra_id = m.id
JOIN customer_db c ON c.id = v.customer_id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND v.status = 'Done'
  AND v.actual_date >= '2025-09-01'
  AND v.actual_date < '2025-11-01'
GROUP BY m.mitra_name, c.customer_name, TO_CHAR(v.actual_date, 'Month')
ORDER BY m.mitra_name, TO_CHAR(v.actual_date, 'Month'), c.customer_name;

-- =====================================================
-- Comparison: September vs October 2025
-- =====================================================

SELECT
  m.mitra_name AS "Nama Mitra",

  -- September Stats
  SUM(CASE WHEN p.month = 9 THEN p.total_visits ELSE 0 END) AS "Sept - Kunjungan",
  'Rp ' || TO_CHAR(SUM(CASE WHEN p.month = 9 THEN p.base_payout ELSE 0 END), 'FM999,999,999') AS "Sept - Base",
  'Rp ' || TO_CHAR(SUM(CASE WHEN p.month = 9 THEN p.bonus_amount ELSE 0 END), 'FM999,999,999') AS "Sept - Bonus",
  'Rp ' || TO_CHAR(SUM(CASE WHEN p.month = 9 THEN p.total_payout ELSE 0 END), 'FM999,999,999') AS "Sept - Total",

  -- October Stats
  SUM(CASE WHEN p.month = 10 THEN p.total_visits ELSE 0 END) AS "Oct - Kunjungan",
  'Rp ' || TO_CHAR(SUM(CASE WHEN p.month = 10 THEN p.base_payout ELSE 0 END), 'FM999,999,999') AS "Oct - Base",
  'Rp ' || TO_CHAR(SUM(CASE WHEN p.month = 10 THEN p.bonus_amount ELSE 0 END), 'FM999,999,999') AS "Oct - Bonus",
  'Rp ' || TO_CHAR(SUM(CASE WHEN p.month = 10 THEN p.total_payout ELSE 0 END), 'FM999,999,999') AS "Oct - Total",

  -- Difference
  SUM(CASE WHEN p.month = 10 THEN p.total_visits ELSE 0 END) -
  SUM(CASE WHEN p.month = 9 THEN p.total_visits ELSE 0 END) AS "Selisih Kunjungan",

  'Rp ' || TO_CHAR(
    SUM(CASE WHEN p.month = 10 THEN p.total_payout ELSE 0 END) -
    SUM(CASE WHEN p.month = 9 THEN p.total_payout ELSE 0 END),
    'FM999,999,999'
  ) AS "Selisih Total Payout"

FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.month IN (9, 10)
  AND p.year = 2025
GROUP BY m.mitra_name
ORDER BY m.mitra_name;

-- =====================================================
-- Visit Details untuk September & October 2025
-- =====================================================

SELECT
  m.mitra_name AS "Nama Mitra",
  c.customer_name AS "Nama Customer",
  v.visit_number AS "Kunjungan Ke-",
  v.scheduled_date AS "Tanggal Terjadwal",
  v.scheduled_day AS "Hari",
  v.actual_date AS "Tanggal Aktual",
  v.status AS "Status",
  v.duration_hours || ' jam' AS "Durasi"
FROM mitra_db m
JOIN visit_db v ON v.mitra_id = m.id
JOIN customer_db c ON c.id = v.customer_id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND v.actual_date >= '2025-09-01'
  AND v.actual_date < '2025-11-01'
  AND v.status = 'Done'
ORDER BY m.mitra_name, v.actual_date, c.customer_name;
