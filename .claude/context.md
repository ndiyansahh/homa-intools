# Claude Code Context for HOMA Project

**Project:** HOMA Internal Management System
**Tech Stack:** Next.js 14 + TypeScript + Drizzle + Neon Postgres
**Last Updated:** 2025-01-29

---

## 🎯 PRIORITY READ ORDER

Claude Code should ALWAYS read these files in sequence:

1. **docs/01-active-context.md** ⭐ (MUST READ FIRST)
2. **docs/02-project-overview.md**
3. **docs/03-development-log.md**
4. **docs/client/feedback-tracking.md**

---

## 📋 Project Type

**Internal management system** for cleaning service business

**Core Features:**
- Trial customer management
- Subscription management
- Mitra (staff) attendance tracking
- Automated payout calculation
- Invoice generation

---

## 🏗️ Architecture
```
Next.js 14 (App Router)
├── TypeScript (strict mode)
├── Tailwind CSS
├── Drizzle ORM
└── Neon PostgreSQL (serverless)
```

**Auth:** JWT with HTTP-only cookies
**Timezone:** Asia/Jakarta (CRITICAL)
**Roles:** ADMIN, OWNER, STAFF

---

## 🚨 CRITICAL CONSTRAINTS

### 1. Timezone Requirement
**ALWAYS use Asia/Jakarta timezone**
- Function: `toJakartaTime()` in `src/lib/date-utils.ts`
- Never use browser timezone
- Never use `new Date()` without conversion

### 2. Payout Calculation
**Formula:** `(actual_visits / scheduled_visits) × monthly_rate`
- Must be pro-rated by calendar month
- Logic location: `src/lib/payout-calculator.ts`
- See: `docs/features/payout-system.md`

### 3. Data Integrity
- No breaking changes to existing data
- Backward compatible migrations only
- Always test with real customer data

### 4. Role-Based Access
- ADMIN: Full access
- OWNER: No settings page
- STAFF: Read-only

---

## 🎯 Current Focus

**Sprint:** Sprint 5 (Feb 5-17, 2026)
**Status:** In Progress (35%)
**Branch:** staging

**Active Work:**
1. Trial form refactor (3a, 3b) - 65%
2. Remove attended button (6a) - Not started
3. PDF payout slip (10) - Blocked (awaiting template)

See: `docs/phases/current-sprint.md`

---

## 📚 When Asked About...

| Question | Document to Read |
|----------|------------------|
| "How does payout calculation work?" | `docs/features/payout-system.md` |
| "What's the current sprint status?" | `docs/phases/current-sprint.md` |
| "Client feedback status?" | `docs/client/feedback-tracking.md` |
| "Why did we choose X?" | `docs/adrs/2025-XX-XX-*.md` |
| "Database schema?" | `docs/technical/database-schema.md` |
| "API endpoints?" | `docs/technical/api-documentation.md` |
| "Recent changes?" | `docs/03-development-log.md` |

---

## 📁 Critical File Locations

**Most Frequently Modified:**
```
src/lib/payout-calculator.ts      # Payout logic ⭐
src/lib/payout-adjustment.ts       # Adjustment logic ⭐
src/components/trial-form.tsx      # Currently refactoring
src/lib/date-utils.ts              # Timezone utilities
src/app/api/payouts/*              # Payout APIs
```

**Core Infrastructure:**
```
drizzle/schema.ts                  # Database schema
middleware.ts                      # Route protection
src/lib/auth.ts                    # JWT session
```

---

## 🧪 Demo Credentials
```
ADMIN:
Email: admin@homa.com
Password: admin123

OWNER:
Email: owner@homa.com
Password: owner123

STAFF:
Email: staff@homa.com
Password: staff123
```

---

## ⚡ Quick Commands
```bash
# Development
npm run dev                        # Start dev server

# Database
npm run db:push                    # Push schema changes
npm run db:studio                  # Open Drizzle Studio

# Build
npm run build                      # Production build
npm run type-check                 # TypeScript check
```

---

## 🔗 External Links

- **GitHub:** https://github.com/ndiyansahh/homa-intools
- **Staging:** [URL] (to be added)
- **Production:** [URL] (to be added)

---

## 💡 For Claude Code

**When generating code:**
1. Check `docs/01-active-context.md` for current priorities
2. Read relevant feature doc in `docs/features/`
3. Follow patterns from existing code
4. Respect the critical constraints above
5. Test with demo credentials
6. Update docs after implementation

**When debugging:**
1. Check `docs/03-development-log.md` for recent changes
2. Review `docs/technical/database-schema.md` for data structure
3. Check `docs/features/` for business logic

**When refactoring:**
1. Read ADRs in `docs/adrs/` for context
2. Check if change affects client feedback items
3. Update relevant documentation

---

**Remember:** Always read `docs/01-active-context.md` first!