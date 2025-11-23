#!/bin/bash

# =====================================================
# ROLLBACK PAYOUT DATA FROM STAGING
# Removes generated visits & payouts for Sept-Oct 2025
# Mitras: Sri Rahayu, Budi Santoso, Ani Yulianti
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

NEON_URL="postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require"

echo -e "${RED}========================================${NC}"
echo -e "${RED}ROLLBACK PAYOUT DATA${NC}"
echo -e "${RED}========================================${NC}"
echo ""

echo -e "${YELLOW}This will DELETE:${NC}"
echo "  • All visits for Sept-Oct 2025 (Sri Rahayu, Budi Santoso, Ani Yulianti)"
echo "  • All payouts for Sept-Oct 2025 (Sri Rahayu, Budi Santoso, Ani Yulianti)"
echo ""

# Show what will be deleted
echo -e "${YELLOW}Current data to be deleted:${NC}"
psql "$NEON_URL" <<EOF
-- Show payouts that will be deleted
SELECT
  'Payout' as type,
  m.mitra_name,
  p.month,
  p.year,
  p.total_visits,
  p.bonus_amount
FROM payout_db p
JOIN mitra_db m ON m.id = p.mitra_id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND p.year = 2025
  AND p.month IN (9, 10);

-- Show visit count
SELECT
  'Visits' as type,
  m.mitra_name,
  EXTRACT(MONTH FROM v.actual_date) as month,
  EXTRACT(YEAR FROM v.actual_date) as year,
  COUNT(*) as total_visits
FROM visit_db v
JOIN mitra_db m ON m.id = v.mitra_id
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
  AND v.actual_date >= '2025-09-01'
  AND v.actual_date < '2025-11-01'
GROUP BY m.mitra_name, EXTRACT(MONTH FROM v.actual_date), EXTRACT(YEAR FROM v.actual_date);
EOF
echo ""

read -p "Are you SURE you want to proceed? (type 'DELETE' to confirm): " CONFIRM

if [ "$CONFIRM" != "DELETE" ]; then
  echo -e "${GREEN}Rollback cancelled - no changes made${NC}"
  exit 0
fi
echo ""

echo -e "${YELLOW}Executing rollback...${NC}"

psql "$NEON_URL" <<EOF
BEGIN;

-- Delete payouts for Sept-Oct 2025
DELETE FROM payout_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
)
AND year = 2025
AND month IN (9, 10);

-- Delete visits for Sept-Oct 2025
DELETE FROM visit_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
)
AND actual_date >= '2025-09-01'
AND actual_date < '2025-11-01';

COMMIT;

-- Verify deletion
SELECT 'Remaining payouts:' as info, COUNT(*) as count
FROM payout_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
)
AND year = 2025
AND month IN (9, 10);

SELECT 'Remaining visits:' as info, COUNT(*) as count
FROM visit_db
WHERE mitra_id IN (
  SELECT id FROM mitra_db
  WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
)
AND actual_date >= '2025-09-01'
AND actual_date < '2025-11-01';
EOF

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}ROLLBACK SUCCESSFUL${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${BLUE}All Sept-Oct 2025 data has been removed${NC}"
else
  echo -e "${RED}✗ Rollback failed!${NC}"
  exit 1
fi
