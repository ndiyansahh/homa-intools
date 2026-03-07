#!/bin/bash
# Production Deployment Script
# Runs migrations and seeds data if needed

set -e # Exit on error

echo "🚀 HOMA Production Deployment Script"
echo "======================================"
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable not set"
  echo "Set it with: export DATABASE_URL='your-database-url'"
  exit 1
fi

echo "✅ Database URL configured"
echo ""

# Step 1: Run migrations
echo "📊 Step 1: Running database migrations..."
npx drizzle-kit push --verbose

if [ $? -eq 0 ]; then
  echo "✅ Migrations completed successfully"
else
  echo "❌ Migration failed! Check logs above."
  exit 1
fi
echo ""

# Step 2: Check if critical tables exist
echo "🔍 Step 2: Verifying critical tables..."
TABLES_CHECK=$(psql "$DATABASE_URL" -t -c "
  SELECT COUNT(*)
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'payout_adjustment_db',
    'mitra_rate_config_db',
    'system_config_db',
    'user_db'
  );
")

if [ "$TABLES_CHECK" -eq 4 ]; then
  echo "✅ All critical tables exist"
else
  echo "⚠️  WARNING: Some tables missing (found $TABLES_CHECK/4)"
  echo "Continuing anyway..."
fi
echo ""

# Step 3: Check if users exist
echo "👥 Step 3: Checking for existing users..."
USER_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM user_db;")

if [ "$USER_COUNT" -eq 0 ]; then
  echo "⚠️  No users found. Seeding demo users..."
  npx tsx scripts/seed-users.ts
  echo "✅ Demo users seeded"
else
  echo "✅ Found $USER_COUNT user(s)"
fi
echo ""

# Step 4: Check if mitras exist
echo "🧹 Step 4: Checking for active mitras..."
MITRA_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM mitra_db WHERE status = 'Active';")

if [ "$MITRA_COUNT" -eq 0 ]; then
  echo "⚠️  No active mitras found. Would you like to seed sample mitras? (y/n)"
  read -r RESPONSE
  if [ "$RESPONSE" = "y" ]; then
    npx tsx scripts/seed-mitras.ts
    echo "✅ Sample mitras seeded"
  else
    echo "⏭️  Skipped mitra seeding"
  fi
else
  echo "✅ Found $MITRA_COUNT active mitra(s)"
fi
echo ""

# Step 5: Initialize system configs
echo "⚙️  Step 5: Initializing system configurations..."
psql "$DATABASE_URL" << 'EOF'
INSERT INTO system_config_db (config_key, config_value, data_type, description, category, updated_by)
VALUES
  ('enable_mitra_region_filter', 'false', 'boolean', 'Enable regional filtering for mitra assignment', 'mitra', 'system'),
  ('enable_schedule_max_hours', 'false', 'boolean', 'Enable maximum hours restriction for scheduling', 'scheduling', 'system'),
  ('lock_completed_visits', 'false', 'boolean', 'Lock completed visits from being edited', 'general', 'system')
ON CONFLICT (config_key) DO NOTHING;
EOF

echo "✅ System configs initialized"
echo ""

# Step 6: Final verification
echo "🎯 Step 6: Final verification..."
echo ""
echo "Database Statistics:"
echo "-------------------"
psql "$DATABASE_URL" << 'EOF'
SELECT
  'Users: ' || COUNT(*) FROM user_db
UNION ALL
SELECT 'Mitras: ' || COUNT(*) FROM mitra_db WHERE status = 'Active'
UNION ALL
SELECT 'Customers: ' || COUNT(*) FROM customer_db WHERE is_deleted = false
UNION ALL
SELECT 'System Configs: ' || COUNT(*) FROM system_config_db WHERE is_active = true;
EOF

echo ""
echo "✅ Deployment completed successfully!"
echo ""
echo "🔑 Next steps:"
echo "  1. Login with: admin@homa.com / admin123"
echo "  2. Change admin password immediately"
echo "  3. Create production users"
echo "  4. Test all features in production"
echo ""
