-- Fix existing visits that don't have originalMitraId and actualMitraId populated
-- This updates visits where these fields are NULL by copying from mitraId

-- Show current state
SELECT
  COUNT(*) as total_visits,
  COUNT(original_mitra_id) as has_original,
  COUNT(actual_mitra_id) as has_actual,
  COUNT(*) - COUNT(original_mitra_id) as missing_original,
  COUNT(*) - COUNT(actual_mitra_id) as missing_actual
FROM visit_db;

-- Update visits where originalMitraId is NULL
UPDATE visit_db
SET
  original_mitra_id = mitra_id,
  updated_at = NOW()
WHERE
  original_mitra_id IS NULL
  AND mitra_id IS NOT NULL;

-- Update visits where actualMitraId is NULL
UPDATE visit_db
SET
  actual_mitra_id = mitra_id,
  updated_at = NOW()
WHERE
  actual_mitra_id IS NULL
  AND mitra_id IS NOT NULL;

-- Verify the fix
SELECT
  COUNT(*) as total_visits,
  COUNT(original_mitra_id) as has_original,
  COUNT(actual_mitra_id) as has_actual,
  COUNT(*) - COUNT(original_mitra_id) as missing_original,
  COUNT(*) - COUNT(actual_mitra_id) as missing_actual
FROM visit_db;

-- Show sample of fixed visits
SELECT
  id,
  visit_number,
  mitra_id,
  original_mitra_id,
  actual_mitra_id
FROM visit_db
LIMIT 5;
