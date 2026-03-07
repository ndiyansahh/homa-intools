# 🐛 HOMA Critical Bugs - Fix Guide

**Last Updated:** 2026-03-07
**Status:** ✅ ALL FIXES IMPLEMENTED
**Affected Bugs:** #1, #2, #3

---

## 📋 Summary

| Bug | Description | Root Cause | Fix Status |
|-----|-------------|------------|------------|
| **#1** | Change Mitra → "Failed to change mitra" | Missing tables in production DB | ✅ FIXED |
| **#2** | Add Visit → Dropdown Mitra Kosong | API response format inconsistency | ✅ FIXED |
| **#3** | Generate Payout → Internal Server Error | Missing tables in production DB | ✅ FIXED |

---

## 🎯 Quick Fix (TL;DR)

```bash
# 1. Run migrations (if production database)
export DATABASE_URL="your-production-database-url"
./scripts/deploy-production.sh

# 2. Test fixes
npm run dev
./scripts/test-critical-bugs.sh
```

---

## 🔧 Detailed Fixes

### **Fix #1: Run Missing Migrations**

**Problem:** Tables `payout_adjustment_db`, `mitra_rate_config_db`, `system_config_db` missing in production.

**Solution:**

```bash
# Option A: Automated script (RECOMMENDED)
export DATABASE_URL="postgresql://your-production-url"
./scripts/deploy-production.sh

# Option B: Manual migration
npx drizzle-kit push --verbose

# Option C: Run specific migration SQL
psql "$DATABASE_URL" < drizzle/0001_exotic_madrox.sql
```

**Verification:**

```bash
psql "$DATABASE_URL" -c "\dt" | grep -E "(payout_adjustment|mitra_rate_config|system_config)"
```

Expected output:
```
 public | mitra_rate_config_db          | table | ...
 public | payout_adjustment_db          | table | ...
 public | system_config_db              | table | ...
```

---

### **Fix #2: Standardize API Response Format**

**Problem:** `/api/mitra?status=Active` returned plain array, frontend expected object with `success` + `data`.

**Changes Made:**

**File:** `src/app/api/mitra/route.ts`

```typescript
// BEFORE (Line 76-82)
const availableMitra: AvailableMitra[] = result.map(...);
return NextResponse.json(availableMitra); // ❌ Plain array

// AFTER
const availableMitra: AvailableMitra[] = result.map(mitra => ({
  id: mitra.id,
  name: mitra.name || 'Unknown',
  phone: mitra.phone || mitra.contact || '',
  mitraName: mitra.name || 'Unknown', // ✅ Backward compat
  contact: mitra.phone || mitra.contact || '', // ✅ Backward compat
}));

return NextResponse.json({
  success: true,    // ✅ Consistent format
  data: availableMitra,
  count: availableMitra.length
});
```

**File:** `src/components/customer-detail.tsx`

```typescript
// BEFORE (Line 737-752)
// Multiple format handlers, inconsistent priority

// AFTER
// Prioritize new format first
if (result.success && result.data && Array.isArray(result.data)) {
  setAllMitras(result.data); // ✅ Primary handler
} else if (result.items && Array.isArray(result.items)) {
  setAllMitras(result.items); // Fallback 1
} else if (Array.isArray(result)) {
  setAllMitras(result); // Fallback 2
} else {
  console.error('Unexpected format:', result);
  setAllMitras([]); // ✅ Explicit empty
}
```

**Verification:**

```bash
curl http://localhost:3000/api/mitra?status=Active | jq
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-here",
      "name": "Siti Nurhaliza",
      "phone": "081234567801",
      "mitraName": "Siti Nurhaliza",
      "contact": "081234567801"
    }
  ],
  "count": 5
}
```

---

### **Fix #3: Seed Active Mitras (If Empty)**

**Problem:** Production database has no active mitras → dropdown empty.

**Solution:**

```bash
# Check if mitras exist
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM mitra_db WHERE status = 'Active';"

# If count = 0, seed sample mitras
npx tsx scripts/seed-mitras.ts
```

**Manual Insert (Alternative):**

```sql
INSERT INTO mitra_db (
  mitra_name, mitra_code, mitra_nik, mitra_gender, mitra_dob,
  mitra_phone, status, is_active, is_deleted,
  monthly_base_rate, mitra_partnership, subscription_type
) VALUES
  ('Siti Nurhaliza', 'MITRA-202603-001', '3201234567890001', 'Wanita', '01/15/1990',
   '081234567801', 'Active', true, false,
   '900000', 'Full Time', 'Regular'),
  ('Budi Santoso', 'MITRA-202603-002', '3201234567890002', 'Pria', '03/22/1988',
   '081234567802', 'Active', true, false,
   '900000', 'Full Time', 'Regular');
```

---

### **Fix #4: Initialize System Configs**

**Problem:** `getConfig()` queries `system_config_db` but table is empty.

**Solution:**

The `deploy-production.sh` script auto-initializes these configs:

```sql
INSERT INTO system_config_db (config_key, config_value, data_type, description)
VALUES
  ('enable_mitra_region_filter', 'false', 'boolean', 'Enable regional filtering'),
  ('enable_schedule_max_hours', 'false', 'boolean', 'Enable max hours restriction'),
  ('lock_completed_visits', 'false', 'boolean', 'Lock completed visits')
ON CONFLICT (config_key) DO NOTHING;
```

**Manual Initialization:**

```bash
psql "$DATABASE_URL" << 'EOF'
INSERT INTO system_config_db (config_key, config_value, data_type, description, category, updated_by)
VALUES
  ('enable_mitra_region_filter', 'false', 'boolean', 'Enable regional filtering for mitra assignment', 'mitra', 'system')
ON CONFLICT (config_key) DO NOTHING;
EOF
```

---

## 🧪 Testing

### **Automated Test:**

```bash
# Start dev server
npm run dev

# Run test script
./scripts/test-critical-bugs.sh
```

Expected output:
```
✅ Bug #2 Fix: Mitra API response format - PASSED
✅ Bug #1 & #3 Fix: All critical tables exist - PASSED
✅ Bug #2 Data: Active mitras available - PASSED

🎉 ALL TESTS PASSED!
```

### **Manual Test:**

**Test Bug #1: Change Mitra**
1. Login → Customers → Select customer with visits
2. Click "Change Mitra" on a visit
3. Select new mitra → Submit
4. ✅ Should succeed without "Failed to change mitra" error

**Test Bug #2: Add Visit Dropdown**
1. Login → Customers → Select customer
2. Click "Add Visit"
3. ✅ Mitra dropdown should show active mitras
4. ❌ If empty → Run `npx tsx scripts/seed-mitras.ts`

**Test Bug #3: Generate Payout**
1. Login → Payout → Select mitra
2. Select month → Click "Generate Payout"
3. ✅ Should succeed without "Internal Server Error"

---

## 📁 Files Changed

### **Modified:**
- ✅ `src/app/api/mitra/route.ts` (API response format)
- ✅ `src/components/customer-detail.tsx` (Response handler priority)

### **Created:**
- ✅ `scripts/deploy-production.sh` (Automated deployment)
- ✅ `scripts/seed-mitras.ts` (Sample mitra seeding)
- ✅ `scripts/test-critical-bugs.sh` (Test script)
- ✅ `BUGFIX-GUIDE.md` (This file)

### **No Changes Needed:**
- ✅ `src/lib/payout-adjustment.ts` (Already correct - has try-catch)
- ✅ `src/app/api/payout/route.ts` (Already correct - just needed tables)
- ✅ `src/lib/config.ts` (Already correct - handles missing configs)

---

## 🚀 Deployment Checklist

### **Local Development:**
- [x] Run migrations: `npx drizzle-kit push`
- [x] Seed users: `npx tsx scripts/seed-users.ts`
- [x] Seed mitras: `npx tsx scripts/seed-mitras.ts`
- [x] Test all 3 bugs manually
- [x] Run automated tests: `./scripts/test-critical-bugs.sh`

### **Staging/Production (VPS):**
```bash
# SSH into VPS
ssh root@194.233.68.67

# Navigate to app directory
cd /var/www/homa-staging  # or homa-production

# Pull latest code
git pull origin staging  # or main

# Run deployment script
export DATABASE_URL="postgresql://homa_user:password@localhost:5432/homa_staging"
./scripts/deploy-production.sh

# Rebuild and restart
npm install
npm run build
pm2 restart homa-staging  # or homa-production

# Verify
pm2 logs homa-staging --lines 50
curl -I https://staging.homa.co.id
```

### **Staging/Production (Supabase):**
```bash
# Update DATABASE_URL in .env
DATABASE_URL="postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres"

# Run deployment
./scripts/deploy-production.sh

# Deploy to Railway/Vercel
git push origin staging  # Auto-deploys via CI/CD
```

---

## 🔍 Troubleshooting

### **Issue: Migration fails with "table already exists"**

**Solution:**
```bash
# Check which tables exist
psql "$DATABASE_URL" -c "\dt" | grep -E "(payout|mitra|system)"

# If table exists but migration fails, skip that migration
# Or use: ON CONFLICT DO NOTHING in migration SQL
```

### **Issue: Dropdown still empty after seeding**

**Checklist:**
1. ✅ Check active mitras count: `SELECT COUNT(*) FROM mitra_db WHERE status = 'Active';`
2. ✅ Check API response: `curl http://localhost:3000/api/mitra?status=Active | jq`
3. ✅ Check browser console for errors
4. ✅ Verify `is_deleted = false` or `is_deleted IS NULL`

### **Issue: Payout generation still fails**

**Checklist:**
1. ✅ Verify tables exist: `\dt` in psql
2. ✅ Check for data: `SELECT * FROM system_config_db;`
3. ✅ Check server logs: `pm2 logs` or browser console
4. ✅ Ensure mitra has `monthly_base_rate` set

---

## 📞 Support

**If bugs persist after fixes:**

1. ✅ Run test script: `./scripts/test-critical-bugs.sh`
2. ✅ Check logs: `pm2 logs --lines 100 | grep ERROR`
3. ✅ Export database state:
   ```bash
   psql "$DATABASE_URL" -c "\dt" > tables.txt
   psql "$DATABASE_URL" -c "SELECT * FROM system_config_db;" > configs.txt
   ```
4. ✅ Share test results + logs for further debugging

---

**Last Verified:** 2026-03-07
**All Fixes Status:** ✅ COMPLETE
**Ready for Deployment:** YES
