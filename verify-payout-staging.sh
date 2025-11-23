#!/bin/bash

# =====================================================
# VERIFY PAYOUT DATA IN STAGING
# Quick verification script after deployment
# Verifies: Sri Rahayu, Budi Santoso, Ani Yulianti
# =====================================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

NEON_URL="postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}STAGING PAYOUT DATA VERIFICATION${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

echo -e "${YELLOW}1. Checking Payout Records${NC}"
psql "$NEON_URL" <<EOF
SELECT
  m.mitra_name AS "Mitra",
  p.month AS "Month",
  p.year AS "Year",
  p.total_visits AS "Visits",
  'Rp ' || TO_CHAR(p.bonus_amount, 'FM999,999,999') AS "Bonus",
  'Rp ' || TO_CHAR(p.total_payout, 'FM999,999,999') AS "Total Payout",
  p.bonus_eligible AS "Bonus Eligible",
  p.status AS "Status"
FROM mitra_db m
JOIN payout_db p ON p.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.year = 2025
  AND p.month IN (9, 10)
ORDER BY m.mitra_name, p.month;
EOF
echo ""

echo -e "${YELLOW}2. Checking Visit Counts${NC}"
psql "$NEON_URL" <<EOF
SELECT
  m.mitra_name AS "Mitra",
  TO_CHAR(v.actual_date, 'Month YYYY') AS "Period",
  COUNT(v.id) AS "Total Visits",
  COUNT(CASE WHEN v.status = 'Done' THEN 1 END) AS "Completed"
FROM mitra_db m
JOIN visit_db v ON v.mitra_id = m.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND v.actual_date >= '2025-09-01'
  AND v.actual_date < '2025-11-01'
GROUP BY m.mitra_name, TO_CHAR(v.actual_date, 'Month YYYY')
ORDER BY m.mitra_name, TO_CHAR(v.actual_date, 'Month YYYY');
EOF
echo ""

echo -e "${YELLOW}3. Summary by Customer${NC}"
psql "$NEON_URL" <<EOF
SELECT
  m.mitra_name AS "Mitra",
  c.customer_name AS "Customer",
  COUNT(v.id) AS "Total Visits"
FROM mitra_db m
JOIN customer_db c ON c.assigned_mitra_id = m.id
JOIN visit_db v ON v.customer_id = c.id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND v.actual_date >= '2025-09-01'
  AND v.actual_date < '2025-11-01'
  AND v.status = 'Done'
GROUP BY m.mitra_name, c.customer_name
ORDER BY m.mitra_name, COUNT(v.id) DESC;
EOF
echo ""

echo -e "${GREEN}✓ Verification Complete${NC}"
echo ""
echo -e "${BLUE}To view detailed payout report:${NC}"
echo "  psql \"\$NEON_URL\" -f show-payout-september-october.sql"
