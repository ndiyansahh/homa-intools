# 01 - Active Context (Master File)

**Last Updated:** 2026-01-30 05:07 WIB
**Current Sprint:** Sprint 5 (Feb 5-17, 2026)
**Status:** ✅ Complete
**Progress:** 100%

---

## 🎯 CURRENT STATUS (Jan 30, 2026)

### Sprint 5 - ✅ COMPLETED

| Item | Description | Status |
|------|-------------|--------|
| 3a/3b | Trial Form Refactor | ✅ Done |
| 6a | Bulk Attendance Actions | ✅ Done |
| 10 | PDF Payout Slip Export | ✅ Done |

# ## Additional Items Completed This Session

| Item | Description | Status |
|------|-------------|--------|
| 4a | Configurable Packages | ✅ Already existed |
| 5a | Same-Day Multiple Visits | ✅ Done (previous session) |
| 7a | Invoice ID in Lists | ✅ Done (previous session) |

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

### Recent Files Modified (Jan 30)
```
src/app/api/payouts/[id]/pdf/route.ts    # NEW - PDF export
src/components/payout-management.tsx      # Added PDF button
src/app/app/settings/page.tsx            # Added packages link
public/images/homa-logo.png              # NEW - Logo for PDF
```

---

## 📊 Project Status Dashboard

### Client Feedback Progress (Jan 3 Meeting)
```
✅ Completed:  13/15 items (87%)
🔄 In Progress: 1/15 items (7%)
⏳ Planned:    1/15 items (6%)
```

**Completed Items:** 1a, 1b, 1c, 2a, 2b, 3a, 3b, 4a, 5a, 6a, 7a, 9, 10
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

### 4. Role-Based Access
```
ADMIN:  Full access (including settings, packages)
OWNER:  All features except settings
STAFF:  Read-only access
```
**Middleware:** `middleware.ts`

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

1. ⏳ Sprint 6 Planning (if any remaining items)
2. ⏳ Rate Config UI (8a) - Demo Feb 10
3. ⏳ Deploy Sprint 5 to production

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

- Sprint 5 completed Jan 30, 2026
- PDF Payout Slip implemented (template received from client)
- Logo replaceable at `/public/images/homa-logo.png`
- All Sprint 5 items ready for staging verification
- Next client demo: Feb 17, 2026

---

**This is the MASTER file. Update daily during active sprints.**
**Everything else is referenced from here.**
**Last updated by: Handi @ 2026-01-30 05:07 WIB**