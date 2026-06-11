# HOMA - Claude Code Instructions

## Project Overview

HOMA adalah sistem manajemen internal untuk cleaning service yang mengelola trial customers, subscription, mitra (cleaners), attendance, payouts, dan role-based access control.

**Current Status:** Sprint 5 Complete (Feb 1, 2026) - Ready for staging deployment

---

## Tech Stack (LOCKED - Jangan ubah tanpa approval)

- **Frontend:** Next.js 15 + React 19 + TypeScript
- **UI:** Tailwind CSS + Lucide Icons
- **Backend:** Next.js API Routes + JWT Auth (HTTP-only cookies)
- **Database:** Neon PostgreSQL + Drizzle ORM
- **PDF Export:** jsPDF + jsPDF-AutoTable
- **Deployment:** PM2 (ecosystem.config.js)
- **Timezone:** Asia/Jakarta ⚠️ CRITICAL

---

## Project Structure

```
homa/
├── docs/                      # 📚 Source of truth - READ FIRST
│   ├── 01-active-context.md  # 🔥 START HERE - Current status
│   ├── 02-project-overview.md
│   ├── 03-development-log.md
│   ├── adrs/                  # Architecture decisions
│   ├── features/              # Feature specs
│   └── technical/             # API docs, DB schema
│
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API endpoints
│   │   ├── app/               # Protected pages (/app/*)
│   │   └── login/             # Public pages
│   ├── components/            # React components
│   ├── lib/                   # Core logic
│   │   ├── schema.ts          # 🔥 Drizzle DB schema
│   │   ├── auth.ts            # 🔥 JWT authentication
│   │   └── utils/             # Helper functions
│   └── types/                 # TypeScript definitions
│
├── scripts/                   # DB utilities (migrate, seed)
├── drizzle/                   # 🔥 Active migrations (auto-generated)
├── public/images/             # Static assets
├── tools/test-data/           # Test data files
│
└── _archive/                  # Old scripts (reference only)
```

---

## Iron Rules (NEVER VIOLATE)

### 1. 🚨 TIMEZONE: Always Asia/Jakarta

```typescript
// ❌ WRONG
const date = new Date()

// ✅ CORRECT
import { toJakartaTime } from '@/lib/date-utils'
const date = toJakartaTime(new Date())
```

**Location:** `src/lib/date-utils.ts`

---

### 2. 🚨 PAYOUT: Pro-Rate Formula

```typescript
payout = (actual_visits / scheduled_visits) × monthly_rate
```

**Location:** `src/lib/payout-calculator.ts`
**Docs:** `docs/features/payout-system.md`

---

### 3. 🚨 DATABASE: Never Edit Schema Directly

```bash
# ❌ WRONG: Edit database manually
# ✅ CORRECT:
1. Edit src/lib/schema.ts
2. npm run db:generate          # Generate migration
3. Review drizzle/*.sql         # Check migration SQL
4. npm run db:migrate           # Apply to DB
```

---

### 4. 🚨 NO BREAKING CHANGES

- Existing customer data must remain valid
- Migrations must be backward compatible
- Always test with real data
- Check impact on payouts before deploying

---

### 5. 🚨 ROLE-BASED ACCESS

```
ADMIN:  Full access (settings, users, packages)
OWNER:  All features except settings
STAFF:  Read-only access
```

**Enforced in:** `middleware.ts`

---

## File Naming Conventions

- **Components:** kebab-case.tsx (e.g., `customer-detail.tsx`)
- **API Routes:** kebab-case folder + route.ts
- **Types:** kebab-case.ts (e.g., `auth.ts`)
- **Utilities:** camelCase.ts (e.g., `dateUtils.ts`)

---

## Before You Start Coding

1. **READ:** `docs/01-active-context.md` - Current status & recent changes
2. **CHECK:** Feature docs in `docs/features/` if touching a major feature
3. **VERIFY:** You understand the timezone and payout constraints
4. **TEST:** Always test with demo accounts before committing

---

## How to Run Locally

```bash
# 1. Install dependencies
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local: Add DATABASE_URL and JWT_SECRET

# 3. Run migrations
npm run db:migrate

# 4. Seed demo users
npx tsx scripts/seed-users.ts

# 5. Start dev server
npm run dev

# 6. Open http://localhost:3000
# Login: admin@homa.com / adminHoma2026!
```

---

## Common Commands

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run type-check       # TypeScript validation
npm run lint             # ESLint check

npm run db:generate      # Generate migration from schema changes
npm run db:migrate       # Apply migrations to DB
npm run db:studio        # Open Drizzle Studio (DB GUI)
```

---

## Deployment

**⚠️ CRITICAL:** Database migrations do NOT auto-apply. You must run them manually during deployment.

**Branches:**
- `staging` → staging.homa.co.id (port 3001)
- `main` → internal.homa.co.id (port 3000)

**Deployment workflow:**
```bash
# Staging (via SSH to VPS)
cd /var/www/homa-staging
bash scripts/deploy-staging.sh

# Production (via SSH to VPS)
cd /var/www/homa-production
bash scripts/deploy-production.sh  # Has safety checks & confirmations
```

**Full guide:** `docs/deployment-guide.md`

**Key deployment steps:**
1. Backup database & .env
2. Pull latest code
3. Install dependencies (if changed)
4. **Run migrations** (if schema changed)
5. Build application
6. Restart PM2
7. Health check + auto-rollback on failure

---

## Need Help?

- **Current status:** `docs/01-active-context.md`
- **Feature docs:** `docs/features/`
- **Architecture decisions:** `docs/adrs/`
- **API reference:** `docs/technical/api-documentation.md`

---

**Last Updated:** 2026-06-11
**Maintained by:** AI Assistant (Claude Code)

## Pending Tasks

### 🔴 Security: Pisahkan Bank Info Mitra ke Tabel Terpisah
- **Status:** Belum dikerjakan — ditunda, butuh planning
- **Problem:** `mitraBankAccount`, `mitraBankHolderName`, `mitraBankAccountNumber` ada di `mitraDB` yang sama dengan data publik. Query `SELECT *` akan expose data banking.
- **Fix:** Buat tabel `mitra_bank_db` terpisah, migrate data, update semua query mitra.
- **Impact:** Breaking change — butuh migration + update semua API yang query mitra.
- **File:** `src/lib/schema.ts`

### 🟡 Security: Standardisasi Error Response
- **Status:** Belum dikerjakan
- **Problem:** Banyak API routes pakai `process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error'`. Kalau NODE_ENV misconfigured di production, error detail bisa bocor.
- **Fix:** Hapus conditional, selalu return generic error message ke client. Log detail hanya ke server.
- **Files:** `src/app/api/customers/route.ts`, `src/app/api/trials/route.ts`, dan banyak route lainnya.

---

## Files NOT to Touch Without Discussion
- src/lib/schema.ts      ← schema change = migration required
- middleware.ts          ← RBAC, salah = security breach
- src/lib/auth.ts        ← JWT logic
- drizzle/               ← auto-generated, jangan edit manual
- ecosystem.config.js    ← PM2 production config
