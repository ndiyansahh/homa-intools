# 02 - Project Overview

**Last Updated:** 2025-01-29
**Version:** 1.4.0 (Sprint 4 deployed)

---

## What is HOMA?

**HOMA Internal Management System** is a web-based application for managing a cleaning service business in Indonesia.

**Core Purpose:**
- Manage trial customers and conversions
- Track subscription customers and visits
- Monitor mitra (staff) attendance
- Automate payout calculations
- Generate invoices

**Users:** Internal staff (admin, owner, operations staff)

---

## Tech Stack

### Frontend
- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Components:** Custom (no UI library)
- **State:** React Server Components (minimal client state)

### Backend
- **API:** Next.js API Routes
- **Auth:** JWT with HTTP-only cookies
- **Session:** Custom JWT implementation
- **Authorization:** Role-based (ADMIN, OWNER, STAFF)

### Database
- **Provider:** Neon PostgreSQL (Serverless)
- **ORM:** Drizzle ORM
- **Migrations:** Drizzle Kit
- **Timezone:** Asia/Jakarta (hardcoded)

### Deployment
- **Platform:** [To be specified]
- **Staging:** [URL]
- **Production:** [URL]

### Development
- **Package Manager:** npm
- **Version Control:** Git + GitHub
- **Branching:** main (prod), staging (dev)

---

## System Architecture

### High-Level Overview
```
┌─────────────────────────────┐
│     Next.js Frontend        │
│  (Server + Client Components│
└──────────┬──────────────────┘
           │
           ├─ Auth Middleware (JWT)
           │
┌──────────▼──────────────────┐
│     Next.js API Routes      │
│   (Backend Business Logic)  │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│      Drizzle ORM            │
│   (Query Builder & Types)   │
└──────────┬──────────────────┘
           │
┌──────────▼──────────────────┐
│    Neon PostgreSQL          │
│   (Database - Serverless)   │
└─────────────────────────────┘
```

---

## Core Features

| Feature | Status | Sprint | Documentation |
|---------|--------|--------|---------------|
| **Authentication** | ✅ Complete | Sprint 1 | `docs/technical/authentication.md` |
| **Trial Management** | 🔄 Refining | Sprint 5 | `docs/features/trial-management.md` |
| **Customer Management** | ✅ Complete | Sprint 2 | `docs/features/customer-management.md` |
| **Visit Scheduling** | ✅ Complete | Sprint 2 | `docs/features/visit-scheduling.md` |
| **Attendance Tracking** | ✅ Complete | Sprint 3 | `docs/features/attendance.md` |
| **Payout System** | ✅ Complete | Sprint 4 | `docs/features/payout-system.md` |
| **Invoice System** | ✅ Basic | Sprint 2 | `docs/features/invoice-system.md` |

---

## Database Schema (High-Level)

### Core Tables
```sql
users           -- System users (admin, owner, staff)
customers       -- Trial & subscription customers
mitras          -- Cleaning staff
subscriptions   -- Customer subscription packages
scheduled_visits-- Planned cleaning visits
attendance      -- Mitra attendance records
payouts         -- Monthly salary calculations
payout_adjustments  -- Corrections for past payouts
invoices        -- Customer billing records
```

**Full Schema:** See `docs/technical/database-schema.md`

---

## Code Organization
```
homa-intools/
├── .cursor/
│   └── rules.mdc              # Cursor AI configuration
├── .claude/
│   └── context.md             # Claude Code configuration
├── docs/                      # ✅ DOCUMENTATION
│   ├── 01-active-context.md   # Current state
│   ├── 02-project-overview.md # This file
│   ├── 03-development-log.md  # Change log
│   ├── features/              # Feature docs
│   ├── adrs/                  # Architecture decisions
│   ├── phases/                # Sprint tracking
│   ├── client/                # Client feedback
│   └── technical/             # Technical specs
├── drizzle/
│   └── schema.ts              # Database schema
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── api/               # API routes
│   │   │   ├── auth/          # Authentication
│   │   │   ├── customers/     # Customer CRUD
│   │   │   ├── mitras/        # Mitra management
│   │   │   ├── payouts/       # Payout calculation
│   │   │   └── trials/        # Trial management
│   │   ├── app/               # Protected app pages
│   │   │   ├── dashboard/     # Dashboard
│   │   │   ├── trial/         # Trial UI
│   │   │   ├── customers/     # Customer UI
│   │   │   ├── attendance/    # Attendance UI
│   │   │   ├── payouts/       # Payout UI
│   │   │   └── settings/      # Settings (admin only)
│   │   ├── login/             # Login page
│   │   └── layout.tsx         # Root layout
│   ├── components/            # React components
│   │   ├── app-shell.tsx      # Main layout
│   │   ├── sidebar.tsx        # Navigation
│   │   └── forms/             # Form components
│   ├── lib/                   # Business logic
│   │   ├── auth.ts            # JWT session
│   │   ├── payout-calculator.ts  # ⭐ Payout logic
│   │   ├── payout-adjustment.ts  # ⭐ Adjustments
│   │   ├── date-utils.ts      # ⭐ Timezone
│   │   └── db/                # Database utilities
│   └── types/                 # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

---

## Key Business Rules

### 1. Subscription Packages
- **Basic:** 1x visit per week (4x/month)
- **Regular:** 2x visits per week (8x/month)
- **Frequent:** 3x visits per week (12x/month)

### 2. Trial System
- Free trial for new customers
- Can convert to paid subscription
- Unlimited trials per customer allowed

### 3. Payout Calculation
- **Monthly base rate** per mitra
- **Pro-rated** by actual attendance
- **Formula:** `(actual_visits / scheduled_visits) × monthly_rate`
- **Split across months** for cross-month invoices

### 4. Attendance
- Mitra clock in/out for each visit
- Tracks actual vs scheduled visits
- Affects payout calculation

### 5. Invoices
- Generated per subscription period
- Can span across calendar months
- Determines payout calculation period

---

## Development Workflow

### Local Setup
```bash
# Clone repo
git clone https://github.com/ndiyansahh/homa-intools.git
cd homa-intools

# Install dependencies
npm install

# Setup environment
cp .env.example .env.local
# Edit .env.local:
# - DATABASE_URL (Neon connection string)
# - JWT_SECRET (min 32 chars)

# Push database schema
npm run db:push

# Start development server
npm run dev
# Access: http://localhost:3000
```

### Git Workflow
```bash
# Main branch: production
# Staging branch: development

# Feature development
git checkout staging
git pull origin staging
git checkout -b feature/my-feature
# ... work ...
git commit -m "feat: description"
git push origin feature/my-feature
# Create PR to staging

# Deployment
# Staging: auto-deploy on push to staging
# Production: merge staging to main
```

### Database Changes
```bash
# Update schema.ts first
# Then push changes
npm run db:push

# Or create migration
npm run db:generate
npm run db:migrate
```

---

## Testing Strategy

### Current State
- **Manual Testing:** Via staging environment
- **Test Data:** Demo credentials + seed data
- **No Automated Tests Yet** ⚠️

### Planned (Sprint 7+)
- Unit tests for business logic
- Integration tests for APIs
- E2E tests for critical flows

---

## Architecture Decisions

Key decisions documented in `docs/adrs/`:

1. **Next.js App Router** (vs Pages Router)
   - Better server components
   - Simplified routing
   - Future-proof

2. **Drizzle ORM** (vs Prisma)
   - Lighter weight
   - More SQL control
   - Better TypeScript inference

3. **JWT Auth** (vs NextAuth)
   - Simpler implementation
   - Full control over sessions
   - No external dependencies

4. **Neon PostgreSQL** (vs Supabase)
   - Pure PostgreSQL experience
   - Serverless architecture
   - Better pricing model

**Full rationale:** See individual ADR files

---

## Known Limitations & Tech Debt

### Current Limitations
1. No automated tests
2. No real-time notifications
3. No caching layer
4. Manual deployment process
5. Limited error logging

### Technical Debt
1. Need i18n for multi-language support
2. Should add WebSocket for real-time updates
3. Consider adding Redis for caching
4. Implement comprehensive logging (e.g., Sentry)
5. Add performance monitoring

**Tracking:** See `docs/technical/tech-debt.md`

---

## Security Features

### Implemented
- ✅ HTTP-only cookies (prevents XSS)
- ✅ JWT tokens with expiration
- ✅ Rate limiting on login
- ✅ CSRF protection (SameSite policy)
- ✅ Audit logging for auth events
- ✅ Input validation on all forms
- ✅ Route protection middleware

### TODO
- Implement content security policy (CSP)
- Add rate limiting on API endpoints
- Implement request/response logging
- Add IP-based blocking for abuse

---

## Performance Targets

### Current Performance
- Page load: < 2 seconds ✅
- API response (p95): < 500ms ✅
- Database queries: Optimized with indexes ✅

### Monitoring
- No monitoring tools yet ⚠️
- Planned: Add performance monitoring in Sprint 7+

---

## For New Developers

**Start Here:**
1. Read `docs/01-active-context.md` (current state)
2. Read this file (02-project-overview.md)
3. Read `docs/03-development-log.md` (recent changes)
4. Read `docs/features/payout-system.md` (most complex feature)
5. Setup local environment (see Development Workflow above)
6. Review `docs/client/feedback-tracking.md` (client priorities)

**Key Principles:**
- Always use Asia/Jakarta timezone
- Never break existing customer data
- Document major decisions in ADRs
- Update documentation when completing features
- Test on staging before production

---

**This file provides project-wide context.**
**Update when major changes occur (quarterly or when architecture changes).**