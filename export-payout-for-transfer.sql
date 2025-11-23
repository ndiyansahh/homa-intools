-- =====================================================
-- EXPORT PAYOUT DATA FOR TRANSFER
-- Format sesuai requirement client
-- Output: Ready for bank transfer processing
-- =====================================================

-- Export Query - Format untuk Transfer
SELECT
  p.payout_id AS "Payout ID",
  m.mitra_code AS "Mitra Code",
  m.mitra_name AS "Mitra Name",
  m.mitra_phone AS "Phone",
  m.mitra_bank_account AS "Bank Account",
  m.mitra_bank_account_number AS "Bank Account Number",
  m.mitra_bank_holder_name AS "Bank Holder Name",
  p.total_visits AS "Qty",
  p.price_per_visit AS "Price per Qty",
  p.bonus_amount AS "Bonus Amount",
  p.total_payout AS "Price Total"
FROM payout_db p
JOIN mitra_db m ON m.id = p.mitra_id
WHERE p.status = 'Paid'  -- Only paid payouts
  AND p.year = 2025
  AND p.month IN (9, 10)  -- September & October 2025
ORDER BY m.mitra_name, p.month;

-- Alternative: Export with formatted currency (Rupiah)
-- Uncomment if you need formatted output
/*
SELECT
  p.payout_id AS "Payout ID",
  m.mitra_code AS "Mitra Code",
  m.mitra_name AS "Mitra Name",
  m.mitra_phone AS "Phone",
  m.mitra_bank_account AS "Bank Account",
  m.mitra_bank_account_number AS "Bank Account Number",
  m.mitra_bank_holder_name AS "Bank Holder Name",
  p.total_visits AS "Qty",
  'Rp ' || TO_CHAR(p.price_per_visit, 'FM999,999,999') AS "Price per Qty",
  'Rp ' || TO_CHAR(p.bonus_amount, 'FM999,999,999') AS "Bonus Amount",
  'Rp ' || TO_CHAR(p.total_payout, 'FM999,999,999') AS "Price Total"
FROM payout_db p
JOIN mitra_db m ON m.id = p.mitra_id
WHERE p.status = 'Paid'
  AND p.year = 2025
  AND p.month IN (9, 10)
ORDER BY m.mitra_name, p.month;
*/
