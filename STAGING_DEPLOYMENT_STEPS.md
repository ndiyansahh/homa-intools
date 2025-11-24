# Staging Deployment Steps

## Overview
This document outlines the steps to deploy the payout export feature and customer editing enhancements to staging.

## Commits Ready for Deployment
- **f0de653**: Payout export feature with monthly/yearly options
- **7a07f23**: Customer editing enhancements and audit tracking

## Pre-Deployment Checklist

### 1. Database Migration Required
**CRITICAL**: Must run migration BEFORE deploying code changes.

The deployment includes schema changes that add `updated_by` fields to 3 tables:
- `attendance_record_db`
- `attendance_schedule_db`
- `visit_db`

### 2. Environment Variables
Ensure `DATABASE_URL` is set in the staging environment:
```bash
DATABASE_URL=postgresql://neondb_owner:npg_Fveo92tcXWNa@ep-winter-field-a18c0zs9-pooler.ap-southeast-1.aws.neon.tech/homa_staging?sslmode=require
```

**SECURITY NOTE**: After this deployment, consider rotating the Neon database password since credentials were previously committed to version control.

## Deployment Steps

### Step 1: Run Database Migration
Connect to Neon staging database and run the migration:

```sql
-- Migration: drizzle/neon-migration/0001_early_sage.sql
ALTER TABLE "attendance_record_db" ADD COLUMN "updated_by" varchar(255);
ALTER TABLE "attendance_schedule_db" ADD COLUMN "updated_by" varchar(255);
ALTER TABLE "visit_db" ADD COLUMN "updated_by" varchar(255);
```

**Verification**:
```sql
-- Verify columns were added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name IN ('attendance_record_db', 'attendance_schedule_db', 'visit_db')
  AND column_name = 'updated_by';
```

Expected result: 3 rows returned

### Step 2: Push Code to Staging
```bash
# Push the staging branch
git push origin staging
```

### Step 3: Deploy Application
Deploy the updated code to your hosting platform (Vercel, etc.)

### Step 4: Verify Deployment

#### Test Payout Export Feature
1. Navigate to Payout Management page
2. Click "Export for Transfer" button
3. Verify CSV downloads with correct data format:
   ```
   Payout ID,Period Year,Period Month,Mitra Code,Mitra Name,Phone,Bank Account,Bank Account Number,Bank Holder Name,Qty,Price per Qty,Bonus Amount,Price Total
   ```
4. Check that the summary row appears at the bottom with totals
5. Test filtering by year, month, and status

API endpoints to test:
```bash
# JSON format
curl "https://your-staging-url/api/payouts/export?year=2025&months=10&format=json"

# CSV format
curl "https://your-staging-url/api/payouts/export?year=2025&months=10&format=csv"
```

#### Test Customer Editing Feature
1. Navigate to Customer Management
2. Click on a customer to view details
3. Click "Edit Customer" button
4. Verify form shows:
   - All customer fields (name, email, phone, address)
   - Region dropdowns (city → district → village)
   - Auto-populated postal code from village selection
5. Make changes and save
6. Verify changes are persisted
7. Check audit logging (updatedBy field should be set)

API endpoint to test:
```bash
# Update customer (requires authentication)
curl -X PUT "https://your-staging-url/api/customers/{id}" \
  -H "Content-Type: application/json" \
  -d '{"customerName": "Updated Name"}'
```

#### Verify Audit Tracking
Check that `updated_by` field is being populated:
```sql
-- Check recent updates
SELECT id, updated_by, updated_at
FROM attendance_record_db
WHERE updated_by IS NOT NULL
ORDER BY updated_at DESC
LIMIT 5;
```

## What Changed

### Payout Export Feature (f0de653)
**New Files:**
- `src/app/api/payouts/export/route.ts` - Export API endpoint
- `src/components/payout-export-button.tsx` - Export button component
- `src/components/payout-empty-state.tsx` - Empty state UI
- `src/lib/export-utils.ts` - Export utility functions

**Modified:**
- `src/components/payout-management.tsx` - Added export buttons

**Features:**
- Export payout data to CSV or JSON
- Filter by year, months, and status
- Includes summary totals row
- Proper CSV formatting and escaping
- Empty state handling

### Customer Editing & Audit (7a07f23)
**Modified Files:**
- `src/app/api/customers/[id]/route.ts` - Full PUT endpoint implementation
- `src/components/customer-detail.tsx` - Major UI enhancement (+315 lines)
- `src/lib/schema.ts` - Added updatedBy fields
- `src/app/api/attendance/[id]/route.ts` - Audit tracking
- `src/app/api/trial/[id]/visits/route.ts` - Audit tracking

**Features:**
- Full customer editing form
- Region cascading dropdowns (city → district → village)
- Auto-populate postal code
- RBAC checks (ADMIN/OWNER only)
- Audit logging with IP tracking
- Updated by user tracking

**Documentation Added:**
- `PAYOUT_DEPLOYMENT_README.md`
- `PAYOUT_EXPORT_FEATURE.md`
- `PAYOUT_EXPORT_INTEGRATION_GUIDE.md`
- `PAYOUT_UPDATE_ANI_YULIANTI.md`
- `READY_TO_DEPLOY.md`

**Migration Files:**
- `drizzle/neon-migration/0000_flat_vapor.sql` - Initial schema
- `drizzle/neon-migration/0001_early_sage.sql` - Updated by fields
- `drizzle/neon-migration/combined_migration.sql` - Combined migrations
- `drizzle/neon-migration/meta/*` - Drizzle metadata

**Security Fixes:**
- `drizzle.config.neon.ts` - Now uses `process.env.DATABASE_URL` instead of hardcoded credentials

## Rollback Plan

If issues are encountered, rollback steps:

1. **Revert code deployment** to previous version via your hosting platform
2. **Revert database migration** (if needed):
   ```sql
   ALTER TABLE "attendance_record_db" DROP COLUMN "updated_by";
   ALTER TABLE "attendance_schedule_db" DROP COLUMN "updated_by";
   ALTER TABLE "visit_db" DROP COLUMN "updated_by";
   ```
3. **Verify rollback**:
   ```bash
   git log origin/staging --oneline -5
   ```

## Post-Deployment Tasks

1. **Monitor logs** for any errors in the first 24 hours
2. **Test all features** with real staging data
3. **Document any issues** found during staging testing
4. **Rotate Neon credentials** if database password was exposed
5. **Update .gitignore** to exclude sensitive files:
   ```
   .env.local.backup
   deploy-*.sh
   rollback-*.sh
   seed-*.sql
   ```

## Notes
- All test data files were excluded from this deployment
- No breaking changes to existing functionality
- All new features are backward compatible
- Staging branch is 2 commits ahead of origin/staging

## Ready to Deploy?
- [x] Migration script reviewed
- [x] Security issues fixed
- [x] Test data excluded
- [x] Environment variables documented
- [x] Rollback plan prepared
- [ ] Migration executed on staging database
- [ ] Code pushed to origin/staging
- [ ] Application deployed
- [ ] Post-deployment verification completed

## Support
If you encounter issues during deployment, check:
1. Database connection and credentials
2. Migration execution logs
3. Application logs for runtime errors
4. Browser console for client-side errors

## Last Updated
2025-11-24

---

Generated during staging deployment preparation for Homa project.
