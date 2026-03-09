# HOMA - Documentation Index

Welcome to HOMA documentation. This directory contains all technical documentation for the cleaning service management system.

---

## 📚 Documentation Structure

### 🔒 Security Documentation (NEW - 2026-03-08)

**Must-read for deployment:**

1. **[SECURITY-AUDIT-REPORT.md](./SECURITY-AUDIT-REPORT.md)** ⭐ START HERE
   Complete security audit report with all findings, fixes, and risk assessment.
   **Audience:** Management, Security Team, Developers

2. **[SECURITY-FIXES.md](./SECURITY-FIXES.md)**
   Technical details of all 14 security fixes implemented.
   **Audience:** Developers, DevOps

3. **[SECURITY-DEPLOYMENT-GUIDE.md](./SECURITY-DEPLOYMENT-GUIDE.md)**
   Step-by-step deployment instructions with rollback procedures.
   **Audience:** DevOps, System Administrators

---

### 📖 Project Documentation

4. **[01-active-context.md](./01-active-context.md)** 🔥
   Current project status, recent changes, and active work.
   **Always check this first before starting work!**

5. **[02-project-overview.md](./02-project-overview.md)**
   High-level project overview, architecture, and tech stack.

6. **[03-development-log.md](./03-development-log.md)**
   Chronological development history and sprint summaries.

---

### 🏗️ Architecture & Design

7. **[adrs/](./adrs/)** - Architecture Decision Records
   - [0001-use-drizzle-orm.md](./adrs/0001-use-drizzle-orm.md)
   - [0002-rbac-implementation.md](./adrs/0002-rbac-implementation.md)
   - [0003-timezone-handling.md](./adrs/0003-timezone-handling.md)
   - More...

---

### ✨ Features

8. **[features/](./features/)** - Feature specifications
   - [payout-system.md](./features/payout-system.md) - Mitra payout calculations
   - [trial-customer-flow.md](./features/trial-customer-flow.md) - Trial workflow
   - [attendance-tracking.md](./features/attendance-tracking.md) - Visit tracking
   - More...

---

### 🔧 Technical Reference

9. **[technical/](./technical/)** - Technical documentation
   - [api-documentation.md](./technical/api-documentation.md) - API reference
   - [database-schema.md](./technical/database-schema.md) - DB structure
   - [deployment.md](./technical/deployment.md) - Deployment guide
   - More...

---

## 🚀 Quick Start Guides

### For New Developers

1. Read [02-project-overview.md](./02-project-overview.md)
2. Check [01-active-context.md](./01-active-context.md)
3. Review relevant [features/](./features/) docs
4. Read [technical/api-documentation.md](./technical/api-documentation.md)

### For Deployment

1. ⚠️ **CRITICAL:** Read [SECURITY-AUDIT-REPORT.md](./SECURITY-AUDIT-REPORT.md)
2. Follow [SECURITY-DEPLOYMENT-GUIDE.md](./SECURITY-DEPLOYMENT-GUIDE.md)
3. Review [SECURITY-FIXES.md](./SECURITY-FIXES.md) for technical details

### For Security Review

1. Start with [SECURITY-AUDIT-REPORT.md](./SECURITY-AUDIT-REPORT.md)
2. Review [SECURITY-FIXES.md](./SECURITY-FIXES.md)
3. Check implementation in source code
4. Verify with [SECURITY-DEPLOYMENT-GUIDE.md](./SECURITY-DEPLOYMENT-GUIDE.md)

---

## 📋 Document Status

| Document | Status | Last Updated | Priority |
|----------|--------|--------------|----------|
| SECURITY-AUDIT-REPORT.md | ✅ Complete | 2026-03-08 | 🔴 Critical |
| SECURITY-FIXES.md | ✅ Complete | 2026-03-08 | 🔴 Critical |
| SECURITY-DEPLOYMENT-GUIDE.md | ✅ Complete | 2026-03-08 | 🔴 Critical |
| 01-active-context.md | ✅ Current | 2026-03-06 | 🟠 High |
| 02-project-overview.md | ✅ Current | 2026-03-06 | 🟡 Medium |
| 03-development-log.md | ✅ Current | 2026-03-06 | 🟡 Medium |

---

## ⚠️ Important Notes

### Security Documents (March 2026)

**All production deployments MUST:**
1. Review the security audit report
2. Follow the deployment guide exactly
3. Complete the security checklist
4. Test in staging first

**Risk if ignored:**
Previous risk score: **8.5/10 (High Risk)**
After fixes: **2.0/10 (Low Risk)**

### Timezone Handling

⚠️ **CRITICAL:** All dates/times MUST use Asia/Jakarta timezone.
See `src/lib/date-utils.ts` for utilities.

### Payout Calculations

⚠️ **CRITICAL:** Pro-rate formula is legally binding.
```
payout = (actual_visits / scheduled_visits) × monthly_rate
```
See [features/payout-system.md](./features/payout-system.md)

---

## 🔄 Document Maintenance

### When to Update

- **SECURITY-*.md:** After any security fix or audit
- **01-active-context.md:** After every sprint/major feature
- **features/*.md:** When feature specification changes
- **technical/*.md:** After API or schema changes

### How to Update

1. Edit the relevant markdown file
2. Update "Last Updated" date
3. Add entry to change history (if applicable)
4. Commit with clear message: `docs: update [filename]`

---

## 📞 Support

### For Technical Questions
- Check relevant documentation first
- Review source code comments
- Ask in team Slack/Discord

### For Security Issues
- **DO NOT** create public issues
- Contact security team directly
- Follow responsible disclosure

### For Documentation Improvements
- Create pull request with changes
- Tag as `documentation`
- Request review from team lead

---

## 📜 License

Internal documentation for HOMA project.
Confidential and proprietary.

---

**Last Updated:** 2026-03-08
**Maintained By:** Development Team
**Next Review:** 2026-06-08
