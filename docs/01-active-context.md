# 01 - Active Context (Master File)

**Last Updated:** 2026-03-07
**Current Sprint:** Critical Bugfix (Mar 7, 2026)
**Status:** ✅ 1 Hotfix Completed
**Progress:** 100%

---

## 🎯 CURRENT STATUS (Mar 7, 2026)

### Critical Bugfix - ✅ COMPLETED (1 hotfix)

| Item | Description | Menu | Root Cause | Status |
|------|-------------|------|------------|--------|
| BUG-1 | Change Mitra returns "Failed to change mitra" | Customer Detail | PostgreSQL date type mismatch | ✅ Fixed |

**Root Cause Analysis:**
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

**Impact:**
- ✅ Change Mitra: Now works correctly with proper mitra availability
- ✅ Slot calculation: Shows accurate availability based on actual bookings
- ✅ Add Visit: Confirmed working (no bug - false alarm from user)

### Files Modified (Mar 7, 2026)
```
src/app/api/trial/[id]/visits/[visitId]/available-mitras/route.ts
  - Lines 148-173: Date conversion and PostgreSQL cast fix
  - Added debug logging for troubleshooting
```

**Commit:** `014a3d6` - fix: resolve date type mismatch in available-mitras API

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
**Last updated by: AI Assistant @ 2026-03-06**