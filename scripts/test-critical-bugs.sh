#!/bin/bash
# Critical Bugs Testing Script
# Tests Bug #1, #2, #3 after fixes

set -e

echo "🧪 HOMA Critical Bugs Testing Script"
echo "====================================="
echo ""

# Check if app is running
if ! curl -s http://localhost:3000 > /dev/null; then
  echo "❌ ERROR: App not running on localhost:3000"
  echo "Start with: npm run dev"
  exit 1
fi

echo "✅ App is running"
echo ""

# Test Bug #2: Dropdown Mitra Kosong
echo "🐛 TEST #1: Bug #2 - Mitra API Response"
echo "========================================="
echo ""
echo "Testing GET /api/mitra?status=Active..."

MITRA_RESPONSE=$(curl -s http://localhost:3000/api/mitra?status=Active)
echo "Response:"
echo "$MITRA_RESPONSE" | jq '.' 2>/dev/null || echo "$MITRA_RESPONSE"
echo ""

# Check if response has success field
if echo "$MITRA_RESPONSE" | jq -e '.success' > /dev/null 2>&1; then
  echo "✅ Response has 'success' field"
else
  echo "❌ Response missing 'success' field"
fi

# Check if response has data array
if echo "$MITRA_RESPONSE" | jq -e '.data | type == "array"' > /dev/null 2>&1; then
  MITRA_COUNT=$(echo "$MITRA_RESPONSE" | jq '.data | length')
  echo "✅ Response has 'data' array with $MITRA_COUNT item(s)"

  if [ "$MITRA_COUNT" -gt 0 ]; then
    echo "✅ Mitras found in response"
    echo ""
    echo "First mitra structure:"
    echo "$MITRA_RESPONSE" | jq '.data[0]'
  else
    echo "❌ WARNING: No mitras in response (dropdown will be empty!)"
  fi
else
  echo "❌ Response missing 'data' array"
fi

echo ""
echo "---"
echo ""

# Test Bug #1 & #3: Database tables existence
echo "🐛 TEST #2: Bug #1 & #3 - Database Tables"
echo "=========================================="
echo ""

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, using default from .env.local"
  export DATABASE_URL=$(grep DATABASE_URL .env.local | head -1 | cut -d'=' -f2 | tr -d '"')
fi

echo "Checking critical tables..."
echo ""

TABLES=(
  "payout_adjustment_db"
  "mitra_rate_config_db"
  "system_config_db"
  "visit_mitra_change_history_db"
)

for TABLE in "${TABLES[@]}"; do
  if psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$TABLE';" | grep -q 1; then
    echo "✅ Table exists: $TABLE"
  else
    echo "❌ Table MISSING: $TABLE"
  fi
done

echo ""
echo "---"
echo ""

# Test system configs
echo "🐛 TEST #3: System Configuration"
echo "================================"
echo ""

CONFIG_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM system_config_db WHERE is_active = true;" 2>&1 | tr -d ' ')

if [ -z "$CONFIG_COUNT" ] || [ "$CONFIG_COUNT" == "0" ]; then
  echo "⚠️  WARNING: No system configs found"
  echo "Run: psql \$DATABASE_URL < scripts/init-system-configs.sql"
else
  echo "✅ Found $CONFIG_COUNT active system config(s)"

  echo ""
  echo "Current configs:"
  psql "$DATABASE_URL" -c "SELECT config_key, config_value, data_type FROM system_config_db WHERE is_active = true;"
fi

echo ""
echo "---"
echo ""

# Test active mitras count
echo "🐛 TEST #4: Active Mitras Check"
echo "==============================="
echo ""

ACTIVE_MITRAS=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM mitra_db WHERE status = 'Active' AND (is_deleted = false OR is_deleted IS NULL);" 2>&1 | tr -d ' ')

if [ "$ACTIVE_MITRAS" == "0" ]; then
  echo "❌ WARNING: No active mitras found!"
  echo "This will cause Bug #2 (empty dropdown)"
  echo ""
  echo "To fix, run: npx tsx scripts/seed-mitras.ts"
else
  echo "✅ Found $ACTIVE_MITRAS active mitra(s)"
  echo ""
  echo "Sample active mitras:"
  psql "$DATABASE_URL" -c "SELECT mitra_name, mitra_phone, status FROM mitra_db WHERE status = 'Active' LIMIT 3;"
fi

echo ""
echo "---"
echo ""

# Summary
echo "📊 TESTING SUMMARY"
echo "=================="
echo ""

PASSED=0
FAILED=0

# Check 1: Mitra API response format
if echo "$MITRA_RESPONSE" | jq -e '.success and .data' > /dev/null 2>&1; then
  echo "✅ Bug #2 Fix: Mitra API response format - PASSED"
  ((PASSED++))
else
  echo "❌ Bug #2 Fix: Mitra API response format - FAILED"
  ((FAILED++))
fi

# Check 2: Critical tables exist
MISSING_TABLES=0
for TABLE in "${TABLES[@]}"; do
  if ! psql "$DATABASE_URL" -t -c "SELECT 1 FROM information_schema.tables WHERE table_name = '$TABLE';" | grep -q 1; then
    ((MISSING_TABLES++))
  fi
done

if [ $MISSING_TABLES -eq 0 ]; then
  echo "✅ Bug #1 & #3 Fix: All critical tables exist - PASSED"
  ((PASSED++))
else
  echo "❌ Bug #1 & #3 Fix: $MISSING_TABLES table(s) missing - FAILED"
  ((FAILED++))
fi

# Check 3: Active mitras exist
if [ "$ACTIVE_MITRAS" -gt 0 ]; then
  echo "✅ Bug #2 Data: Active mitras available - PASSED"
  ((PASSED++))
else
  echo "❌ Bug #2 Data: No active mitras - FAILED (dropdown will be empty)"
  ((FAILED++))
fi

echo ""
echo "---"
echo ""
echo "TOTAL: $PASSED passed, $FAILED failed"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 ALL TESTS PASSED!"
  echo "All critical bugs should be fixed."
  exit 0
else
  echo "⚠️  SOME TESTS FAILED"
  echo "Review failures above and apply fixes."
  exit 1
fi
