# 01 - Active Context (Master File)

**Last Updated:** 2026-05-21
**Current Sprint:** Production Seed Data (May 21, 2026)
**Status:** ✅ 4 Critical Bugs Fixed, ✅ Payout Logic Verified, ✅ ETL Updated, ⏳ VPS Deployment Pending
**Progress:** 100% (Code + Docs), 0% (Deployment)

---

## 🎯 CURRENT STATUS (May 21, 2026)

### Production Seed CSV Format - ✅ FINALIZED

**CSV Template Header (76 columns):**
```
invoice_number | client_name | address | subscription_package | start_date | end_date | new_end_date | mitra_1 | day_1..day_7 | visit_1..visit_31 | backup_mitra_1..backup_mitra_31 | total_visits
```

**Column Rules:**
| Kolom | Required | Format | Ket |
|-------|----------|--------|-----|
| `day_1..day_7` | Required | Monday / Tuesday / dst | Hari kunjungan rutin, sisanya kosong |
| `visit_1..visit_31` | Required | `YYYY-MM-DD` → Done, `YYYY-MM-DD\nALASAN` → Cancelled, kosong → skip | Tanggal final (sudah include reschedule) |
| `backup_mitra_1..backup_mitra_31` | Optional | `Nama Mitra (MITRA-XXXXXX-XXXXXX)` | Index 1-to-1 dengan visit_X. Kosong = pakai mitra_1. Jika reschedule + ganti mitra: ubah tanggal di visit_X dan isi backup_mitra_X |
| `total_visits` | Required | Integer | Engine baca sampai kolom ini, ignore sisanya |

**ETL Script:** `scripts/etl-visits.ts` — sudah support `backupMitras[]` per visit
- `originalMitraId` = selalu `mitra_1` (audit trail)
- `actualMitraId` = backup mitra jika ada, fallback ke `mitra_1`
- Payout otomatis dihitung ke mitra yang actual kerja

---

## 🎯 CURRENT STATUS (Mar 7, 2026 - Night Update)

### Critical Production Bugfix - ✅ CODE COMPLETE (4 bugs fixed)

| Bug | Description | Menu | Root Cause | Code Fix | VPS Deploy |
|-----|-------------|------|------------|----------|------------|
| **#1** | Change Mitra error on date mismatch | Customer Detail | PostgreSQL date type mismatch | ✅ Fixed | ⏳ Pending |
| **#2** | Empty mitra dropdown in Add Visit | Customer Detail | Inconsistent API response format | ✅ Fixed | ⏳ Pending |
| **#3** | Payout generation "Internal server error" | Payout | Missing DB tables in production | ✅ Ready | ⏳ Pending |
| **#4** | Package frequency not saved to database | Packages | No visits_per_week column | ✅ Fixed | ⏳ Pending |

---

### Bug #1: Change Mitra Date Mismatch ✅ FIXED

**Root Cause:**
- PostgreSQL `date` column compared with JavaScript `Date` object using Drizzle `eq()` failed
- Query always returned 0 visits → all mitras appeared available incorrectly
- Error thrown in catch block with generic "Failed to change mitra" message

**Fix Applied:**
```typescript
// Convert date to string with explicit PostgreSQL ::text cast
const scheduledDateStr = visit.scheduledDate instanceof Date
  ? visit.scheduledDate.toISOString().split('T')[0]
  : String(visit.scheduledDate);

// Use sql template for explicit type casting
.where(and(
  sql`${visitDB.scheduledDate}::text = ${scheduledDateStr}`,
  // ... other conditions
))
```

**Files:** `src/app/api/trial/[id]/visits/[visitId]/available-mitras/route.ts:148-173`

---

### Bug #2: Empty Mitra Dropdown ✅ FIXED

**Root Cause:**
- API `/api/mitra` returned inconsistent response formats
- Frontend expected specific format but API changed
- No mitras appeared in "Add Visit" dropdown

**Fix Applied:**
```typescript
// Standardized API response
return NextResponse.json({
  success: true,
  data: availableMitra,
  count: availableMitra.length
});

// Frontend with backward compatibility
if (result.success && result.data && Array.isArray(result.data)) {
  setAllMitras(result.data);
} else if (result.items) { // fallback
  setAllMitras(result.items);
}
```

**Files:**
- `src/app/api/mitra/route.ts:76-90`
- `src/components/customer-detail.tsx:736-752`

---

### Bug #3: Payout Generation Error ✅ MIGRATION READY

**Root Cause:**
- Production VPS missing 3 database tables:
  - `payout_adjustment_db`
  - `mitra_rate_config_db`
  - `system_config_db`
- These tables exist in Neon (development) but not deployed to VPS

**Fix Prepared:**
- Migration files ready: `drizzle/neon-migration/0001_early_sage.sql`
- Deployment script created: `scripts/deploy-production.sh`
- VPS deployment guide: `VPS-DEPLOYMENT-GUIDE.md`

**Status:** ⏳ Awaiting VPS deployment

---

### Bug #4: Package Frequency Not Saved ✅ FIXED

**Root Cause:**
- Package frequency only stored in package name string
- No dedicated `visits_per_week` database column
- Frequency dropdown in UI but value not persisted

**Fix Applied:**

**Database Migration:**
```sql
ALTER TABLE subscription_package_db
ADD COLUMN visits_per_week INTEGER DEFAULT 1 NOT NULL;

ALTER TABLE subscription_package_db
ADD CONSTRAINT visits_per_week_range
CHECK (visits_per_week >= 0 AND visits_per_week <= 7);
```

**Schema Update:**
```typescript
export const subscriptionPackageDB = pgTable('subscription_package_db', {
  // ...
  visitsPerWeek: integer('visits_per_week').default(1).notNull(),
  // ...
});
```

**API Updates:**
- POST `/api/packages` - accepts `visitsPerWeek` parameter (validation: 0-7)
- PUT `/api/packages/:id` - accepts `visitsPerWeek` parameter (validation: 0-7)
- GET `/api/packages` - reads from DB column (fallback to parsing name)

**Frontend:**
- `src/app/app/packages/page.tsx` - sends `visitsPerWeek` in request body

**Files:**
- `src/lib/schema.ts:51-60`
- `src/app/api/packages/route.ts:64-82, 110-119`
- `src/app/api/packages/[id]/route.ts:34-63, 102-113`
- `src/app/app/packages/page.tsx:72-80`

**Migration Files:**
- `drizzle/manual-add-visits-per-week.sql` (local - already applied ✅)
- `drizzle/vps-add-visits-per-week.sql` (VPS production - ⏳ pending)

---

### Files Modified (Mar 7, 2026 - PM)
```
# Bug #1: Date mismatch fix
src/app/api/trial/[id]/visits/[visitId]/available-mitras/route.ts

# Bug #2: Mitra dropdown fix
src/app/api/mitra/route.ts                    # Standardized response
src/components/customer-detail.tsx            # Response handling

# Bug #4: Package frequency fix
src/lib/schema.ts                             # Added visitsPerWeek field
src/app/api/packages/route.ts                 # POST/GET updates
src/app/api/packages/[id]/route.ts            # PUT update
src/app/app/packages/page.tsx                 # Frontend sends value

# Deployment files (NEW)
VPS-DEPLOYMENT-GUIDE.md                       # Step-by-step deployment
BUGFIX-GUIDE.md                               # Technical documentation
drizzle/vps-add-visits-per-week.sql           # VPS migration
drizzle/manual-add-visits-per-week.sql        # Local migration (applied)
scripts/deploy-production.sh                  # Deployment automation
scripts/seed-mitras.ts                        # Seed sample mitras
scripts/test-critical-bugs.sh                 # Testing automation
```

**Commits:**
- `014a3d6` - fix: resolve date type mismatch in available-mitras API (Bug #1)
- `631450a` - docs: update logs for Change Mitra bugfix
- `d4b4df1` - fix: resolve 4 critical production bugs (Bug #2, #3, #4)

**Branch:** `staging` (pushed to GitHub ✅)

---

### Payout Logic Verification - ✅ VERIFIED (Mar 7, 2026 - Night)

**Requirement Review:**
Client provided detailed payout requirements for verification:
- Pro-rate formula validation
- Dynamic billing cycle handling
- Payout adjustment mechanism
- Historical visit editing capability

**Verification Results:**

| Requirement | Expected | Actual Implementation | Status |
|------------|----------|----------------------|--------|
| **Pro-rate Formula** | `(actual_visits / scheduled_visits) × monthly_rate` | ✅ Implemented in `src/app/api/payout/route.ts:396-401` | ✅ CORRECT |
| **Billing Cycle** | Dynamic per visit scheduled date, not payout month | ✅ `getBillingCycle()` function (lines 21-51) | ✅ CORRECT |
| **Cross-Month Invoice** | Jan 7-Feb 6: 8 visits in Jan = 8/9 × 900K, 1 visit in Feb = 1/9 × 900K | ✅ Groups by billing cycle per visit (lines 292-312) | ✅ CORRECT |
| **Scheduled Denominator** | Total scheduled in invoice period, not per mitra | ✅ No mitra filter on denominator (lines 380-390) | ✅ CORRECT |
| **Payout Adjustment** | Auto-create on historical edit, apply to next payout | ✅ `payout-adjustment.ts` + applied in route (lines 433-543) | ✅ CORRECT |
| **Historical Edit Lock** | Default unlocked, editable anytime | ✅ `LOCK_COMPLETED_VISITS = false` default | ✅ CORRECT |

**Example Verified:**
```
Invoice: Jan 7 - Feb 6, 2026 (9 total scheduled)
Jan Payout: 8/9 × Rp 900,000 = Rp 800,000 ✅
Feb Payout: 1/9 × Rp 900,000 = Rp 100,000 ✅

Later discovery: Jan 31 didn't attend
Adjustment: -1/9 × Rp 900,000 = -Rp 100,000 ✅
Next Feb Payout: Rp 200,000 - Rp 100,000 = Rp 100,000 ✅
```

**Documentation Updated:**
1. ✅ `docs/features/payout-system.md` - Updated with correct file paths and implementation details
2. ✅ `docs/features/historical-visit-editing.md` - NEW comprehensive guide created
3. ✅ `docs/01-active-context.md` - Added verification results (this file)

**Files Analyzed:**
```
src/app/api/payout/route.ts                              # Main payout generation
src/lib/payout-adjustment.ts                             # Adjustment detection
src/app/api/trial/[id]/visits/[visitId]/change-mitra/route.ts  # Mitra change with adjustment
src/lib/config.ts                                        # LOCK_COMPLETED_VISITS config
```

**Conclusion:** 🎉 **All payout requirements fully implemented and verified. No code changes needed.**

---

### Next Steps: VPS Deployment

**Status:** ⏳ Code ready, awaiting deployment to VPS (194.233.68.67)

**Deployment Checklist:**
- [ ] SSH to VPS at 194.233.68.67
- [ ] Pull latest code from `staging` branch
- [ ] Backup databases (homa_staging, homa_production)
- [ ] Run migrations (Bug #3: missing tables, Bug #4: visits_per_week column)
- [ ] Rebuild applications (npm run build)
- [ ] Restart PM2 (homa-staging, homa-production)
- [ ] Test all 4 bug fixes on staging.homa.co.id
- [ ] Deploy to production internal.homa.co.id

**Guide:** See `VPS-DEPLOYMENT-GUIDE.md` for complete step-by-step instructions

**Estimated Time:** 30 minutes per environment (staging + production = 1 hour)

---

## 🎯 PREVIOUS STATUS (Mar 6, 2026)

### UI Cleanup & Verification - ✅ COMPLETED (3 items)

| Item | Description | Menu | Status |
|------|-------------|------|--------|
| UI-1 | Remove misleading area limitation warnings | Trial | ✅ Done |
| UI-2 | Update error messages to not mention region | Customer Form | ✅ Done |
| UI-3 | Verify default visit status = "Done" across ALL endpoints | All | ✅ Verified |

### Files Modified (Mar 6, 2026)
```
# UI Cleanup
src/components/trial-management.tsx      # Removed region warnings, updated messages (7 locations)
src/components/customer-form.tsx         # Updated error message for mitra availability (1 location)

# Verification - Visit Status Default = "Done" (9 endpoints verified)
src/app/api/customers/route.ts           # ✅ Line 317
src/app/api/trial/route.ts               # ✅ Lines 238, 672
src/app/api/customers/[id]/visits/route.ts  # ✅ Lines 112, 224, 280, 407
src/app/api/trial/[id]/visits/route.ts   # ✅ Multiple locations
src/lib/utils/subscriptionUtils.ts       # ✅ Line 244 (with Feedback Feb 1 comment)
```

---

## 🎯 PREVIOUS STATUS (Feb 1, 2026)

### Sprint 5 Hotfixes - ✅ COMPLETED (8 items)

| Item | Description | Menu | Status |
|------|-------------|------|--------|
| 7a | Allow backdate in trial form | Trial | ✅ Done |
| 7b | Remove area restriction for mitra | Trial | ✅ Done |
| 7c | Fix mitra not saving after assignment | Trial | ✅ Done |
| 8a | Default visit status to "Done" | Customer | ✅ Done |
| 8b | Fix change mitra error | Customer | ✅ Done |
| 8c | Fix add visit mitra dropdown empty | Customer | ✅ Done |
| 9a | Fix payout generation error | Payout | ✅ Done |
| 10a | Add frequency input to package form | Packages | ✅ Done |

### Files Modified Today (Feb 1, 2026)
```
# Trial Menu
src/components/trial-management.tsx      # Backdate, area filter, mitra saving
src/types/trial.ts                        # Added assignedMitraId
src/app/api/trials/route.ts               # Save mitra ID

# Customer Menu  
src/lib/utils/subscriptionUtils.ts        # Default Done + completedAt
src/app/api/trial/route.ts                # Default Done + completedAt (2x)
src/app/api/customers/route.ts            # Default Done + completedAt
src/app/api/trial/[id]/visits/[visitId]/change-mitra/route.ts  # Region check fix
src/components/customer-detail.tsx        # Add visit mitra fetch fix

# Packages Menu
src/app/app/packages/page.tsx             # Added frequency dropdown
```

---

## ⚡ Quick Reference

### Tech Stack
- **Frontend:** Next.js 14 + TypeScript + Tailwind CSS
- **Backend:** Next.js API Routes + JWT Auth
- **Database:** Neon PostgreSQL + Drizzle ORM
- **PDF:** jspdf + jspdf-autotable
- **Timezone:** Asia/Jakarta ⚠️ **CRITICAL**

### Demo Credentials
```
ADMIN: admin@homa.com / admin123
OWNER: owner@homa.com / owner123
STAFF: staff@homa.com / staff123
```

### Recent Files Modified (Jan 30-31)
```
# JWT Authentication (ADR 0002)
src/lib/schema.ts                         # Added userDB table
src/lib/auth.ts                           # mustChangePassword support
src/lib/users.ts                          # Database-backed auth
src/app/api/auth/login/route.ts           # Lockout handling
src/app/api/auth/change-password/route.ts # NEW
src/app/api/auth/users/route.ts           # NEW - Admin provisioning
middleware.ts                             # RBAC + force change
src/app/change-password/page.tsx          # NEW
scripts/seed-users.ts                     # NEW

# PDF Export
src/app/api/payouts/[id]/pdf/route.ts     # PDF export
src/components/payout-management.tsx       # Added PDF button
```

---

## 📊 Project Status Dashboard

### Client Feedback Progress (Jan 3 Meeting + Feb 1 Hotfixes)
```
✅ Completed:  21/23 items (91%)
🔄 In Progress: 1/23 items (4%)
⏳ Planned:    1/23 items (4%)
```

**Completed Items:** 1a, 1b, 1c, 2a, 2b, 3a, 3b, 4a, 5a, 6a, 7a-7c, 8a-8c, 9a, 10a, 10
**In Progress:** 8a (Rate Config UI)
**Planned:** 8b (Adjustment Mechanism)

### Sprint 5 Status
```
Duration: Feb 5-17, 2026 (12 days)
Progress: 100% COMPLETE ✅
Tasks: 3 total, 3 completed
On Track: Yes ✅
```

### Deployment Status
```
Staging:    Sprint 5 complete ✅
Production: Sprint 3 stable ✅
```

---

## 🚨 CRITICAL CONSTRAINTS (NEVER VIOLATE)

### 1. Timezone: ALWAYS Asia/Jakarta
```typescript
// ❌ WRONG
const date = new Date()

// ✅ CORRECT
import { toJakartaTime } from '@/lib/date-utils'
const date = toJakartaTime(new Date())
```
**Location:** `src/lib/date-utils.ts`

---

### 2. Payout Calculation: Pro-Rate Formula
```typescript
// Formula
payout = (actual_visits / scheduled_visits) × monthly_rate

// Example
// Invoice: Jan 7 - Feb 6 (9 total visits)
// Monthly rate: Rp 900,000
// Jan: 8 visits = 8/9 × 900,000 = Rp 800,000
// Feb: 1 visit  = 1/9 × 900,000 = Rp 100,000
```
**Location:** `src/lib/payout-calculator.ts`
**Docs:** `docs/features/payout-system.md#calculation-logic`

---

### 3. No Breaking Changes
- Existing customer data must remain valid
- Migrations must be backward compatible
- Always test with real data
- Check impact on payouts before deploying

---

### 4. Role-Based Access (ADR 0002)
```
ADMIN:  Full access (including settings, packages, user management)
OWNER:  All features except settings
STAFF:  Read-only access
```
**Middleware:** `middleware.ts`
**Docs:** `docs/adrs/0002-jwt-authentication.md`, `docs/features/login-auth.md`

---

## 📚 Where to Find Info

| Need to Know | Read This Document |
|--------------|-------------------|
| **"What's this project about?"** | `docs/02-project-overview.md` |
| **"What changed recently?"** | `docs/03-development-log.md` |
| **"How does payout work?"** | `docs/features/payout-system.md` |
| **"Can I edit historical visits?"** | `docs/features/historical-visit-editing.md` ⭐ NEW |
| **"Why did we choose X?"** | `docs/adrs/2025-XX-XX-decision.md` |
| **"Current sprint details?"** | `docs/phases/current-sprint.md` |
| **"Client feedback status?"** | `docs/clients/feedback-tracking.md` |
| **"Database structure?"** | `docs/technical/database-schema.md` |
| **"API endpoints?"** | `docs/technical/api-documentation.md` |

---

## 🔗 Quick Links

- **GitHub:** https://github.com/ndiyansahh/homa-intools
- **Branch:** `staging`
- **Staging URL:** [To be added]
- **Full Context:** Read `docs/02-project-overview.md`
- **Client Feedback:** Read `docs/clients/feedback-tracking.md`

---

## 🎯 Next Steps

1. ✅ Run DB migration for `user_db` table
2. ✅ Seed demo users (`npx tsx scripts/seed-users.ts`)
3. ⏳ Sprint 6 Planning (if any remaining items)
4. ⏳ Rate Config UI (8a) - Demo Feb 10
5. ⏳ Deploy Sprint 5 to production

---

## 💡 For AI Tools (Claude Code / Cursor)

**When you start working:**
1. Read this file first (01-active-context.md)
2. Check current status above
3. Read relevant feature doc if needed
4. Review recent changes in `docs/03-development-log.md`
5. Respect the critical constraints
6. Update docs when you finish a task

**Key Principles:**
- This file = source of truth for current state
- Always check here before assuming anything
- Never ignore the timezone constraint
- Payout calculation must follow the formula

---

## 📝 Quick Notes

- **Mar 7, 2026 (Night): Payout logic verification completed** ✅
  - **Client Review:** Verified pro-rate formula, billing cycle, and adjustment mechanism
  - **Verification Result:** All requirements 100% implemented correctly - NO CODE CHANGES NEEDED
  - **Documentation Updated:**
    - ✅ `payout-system.md` - Corrected file paths and added implementation details
    - ✅ `historical-visit-editing.md` - NEW comprehensive guide created
    - ✅ `active-context.md` - Added verification results
  - **Key Findings:**
    - Pro-rate formula: ✅ Correct (`completed / scheduled × monthly_rate`)
    - Dynamic billing cycle: ✅ Correct (per visit scheduled date)
    - Cross-month invoices: ✅ Correct (Jan 7-Feb 6 split handled properly)
    - Payout adjustments: ✅ Correct (auto-created on historical edit)
    - Historical edit lock: ✅ Correct (default unlocked, editable anytime)
- **Mar 6, 2026: UI cleanup & verification completed**
  - **UI Fix 1 & 2:** Removed misleading area limitation warnings from Trial and Customer forms
    - Backend already correct (no region filter since Feb 1)
    - Frontend UI still showed region-based warnings causing user confusion
    - Fixed 7 locations in trial-management.tsx + 1 in customer-form.tsx
  - **Verification:** Confirmed ALL 9 visit creation endpoints default to status = "Done"
    - Verified consistency across customers, trials, and subscription utilities
    - All endpoints include completedAt for payout calculation
    - No inconsistencies found - all match Feedback 4 requirement
- **Feb 1, 2026: 8 hotfixes completed for Trial/Customer/Payout/Packages menus**
- Sprint 5 completed Jan 30, 2026
- JWT Auth (ADR 0002) implemented Jan 31
- PDF Payout Slip implemented (template received from client)
- Logo replaceable at `/public/images/homa-logo.png`
- All hotfixes ready for staging verification
- Next client demo: Feb 17, 2026

---

**This is the MASTER file. Update daily during active sprints.**
**Everything else is referenced from here.**
**Last updated by: AI Assistant @ 2026-03-07**