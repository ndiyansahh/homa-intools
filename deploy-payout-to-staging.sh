#!/bin/bash

# =====================================================
# DEPLOY PAYOUT DATA TO STAGING (NEON)
# Deploy visits & payouts for Sri Rahayu, Budi Santoso & Ani Yulianti
# September - October 2025
# Note: Ani Yulianti is NOT eligible for bonus (bonus = 0)
# =====================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Neon connection string (from drizzle.config.neon.ts)
NEON_URL="postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}PAYOUT DATA DEPLOYMENT TO STAGING${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Step 1: Backup current data
echo -e "${YELLOW}[1/5] Creating backup...${NC}"
BACKUP_FILE="backup-staging-payout-$(date +%Y%m%d-%H%M%S).sql"

psql "$NEON_URL" > "$BACKUP_FILE" 2>/dev/null <<EOF
-- Backup existing payout data for Sept-Oct 2025
COPY (
  SELECT * FROM payout_db
  WHERE mitra_id IN (
    SELECT id FROM mitra_db
    WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
  )
  AND year = 2025 AND month IN (9, 10)
) TO STDOUT WITH CSV HEADER;

-- Backup existing visits for Sept-Oct 2025
COPY (
  SELECT * FROM visit_db
  WHERE mitra_id IN (
    SELECT id FROM mitra_db
    WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002')
  )
  AND actual_date >= '2025-09-01' AND actual_date < '2025-11-01'
) TO STDOUT WITH CSV HEADER;
EOF

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Backup created: $BACKUP_FILE${NC}"
else
  echo -e "${YELLOW}⚠ No existing data to backup (this is okay for first deployment)${NC}"
fi
echo ""

# Step 2: Check if mitras exist
echo -e "${YELLOW}[2/5] Checking mitras exist in staging...${NC}"
MITRA_CHECK=$(psql "$NEON_URL" -t -c "SELECT COUNT(*) FROM mitra_db WHERE mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007');")
MITRA_COUNT=$(echo "$MITRA_CHECK" | tr -d '[:space:]')

if [ "$MITRA_COUNT" -eq 3 ]; then
  echo -e "${GREEN}✓ All 3 mitras found (Sri Rahayu, Budi Santoso, Ani Yulianti)${NC}"
else
  echo -e "${RED}✗ ERROR: Not all mitras found in staging database! (Found: $MITRA_COUNT, Expected: 3)${NC}"
  echo -e "${YELLOW}  Please run seed-mitra-data.sql first${NC}"
  exit 1
fi
echo ""

# Step 3: Check customer count
echo -e "${YELLOW}[3/5] Checking customers assigned to mitras...${NC}"
psql "$NEON_URL" <<EOF
SELECT
  m.mitra_name,
  m.mitra_bonus_commission as bonus_eligible,
  COUNT(c.id) as customer_count,
  STRING_AGG(c.customer_name, ', ') as customers
FROM mitra_db m
LEFT JOIN customer_db c ON c.assigned_mitra_id = m.id AND c.is_active = true
WHERE m.mitra_code IN ('MITRA-202510-011', 'MITRA-202501-002', 'MITRA-202506-007')
GROUP BY m.mitra_name, m.mitra_bonus_commission;
EOF
echo ""

# Step 4: Confirm deployment
echo -e "${YELLOW}[4/5] Ready to deploy...${NC}"
echo -e "${BLUE}This will:${NC}"
echo "  • Generate visits for September & October 2025"
echo "  • Mark all visits as 'Done'"
echo "  • Create payout records based on completed visits"
echo "  • Apply to: Sri Rahayu, Budi Santoso, Ani Yulianti"
echo "  • Note: Ani Yulianti will have NO BONUS (bonus = 0)"
echo ""
read -p "Continue with deployment? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  echo -e "${RED}Deployment cancelled${NC}"
  exit 0
fi
echo ""

# Step 5: Deploy the script
echo -e "${YELLOW}[5/5] Deploying dynamic payout data...${NC}"
psql "$NEON_URL" -f seed-dynamic-visits-payout-2025-v2.sql

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}========================================${NC}"
  echo -e "${GREEN}DEPLOYMENT SUCCESSFUL!${NC}"
  echo -e "${GREEN}========================================${NC}"
  echo ""
  echo -e "${BLUE}Next steps:${NC}"
  echo "  1. Verify data: ./verify-payout-staging.sh"
  echo "  2. View payouts: psql \"\$NEON_URL\" -f show-payout-september-october.sql"
  echo ""
  echo -e "${YELLOW}Backup saved to: $BACKUP_FILE${NC}"
else
  echo -e "${RED}✗ Deployment failed!${NC}"
  echo -e "${YELLOW}To rollback, restore from: $BACKUP_FILE${NC}"
  exit 1
fi
