# HOMA Project Roadmap

**Last Updated:** January 29, 2026  
**Current Sprint:** Sprint 5 (Feb 5-17)  
**Project Status:** 60% Complete (Client Feedback Basis)

---

## Overview

This roadmap tracks the HOMA Internal Management System development from inception through planned future enhancements.

**Project Start:** December 1, 2025  
**MVP Target:** March 31, 2026  
**Current Phase:** Core Features Complete, Polish & Enhancements

---

## Roadmap Timeline
```
2025 Dec         2026 Jan         2026 Feb         2026 Mar         2026 Apr+
    |               |               |               |               |
┌───────┐      ┌───────┐      ┌───────┐      ┌───────┐      ┌───────┐
│Sprint1│      │Sprint3│      │Sprint5│      │Sprint7│      │Future │
│Found. │      │Attend.│      │TrialUX│      │Polish │      │       │
└───┬───┘      └───┬───┘      └───┬───┘      └───────┘      └───────┘
    │              │              │
    └─┌───────┐   └─┌───────┐   └─┌───────┐
      │Sprint2│     │Sprint4│     │Sprint6│
      │Cust.  │     │Payout │     │Config │
      │Visits │     │Improve│     │PKG    │
      └───────┘     └───────┘     └───────┘

Legend:
✅ Completed    🔄 In Progress    ⏳ Planned    💭 Future
```

---

## Completed Sprints ✅

### Sprint 1: Foundation (Dec 1-19, 2025) ✅
**Status:** ✅ COMPLETED  
**Goal:** Build solid technical foundation

**Delivered:**
- JWT authentication system
- Role-based access control (ADMIN, OWNER, STAFF)
- App shell & navigation
- Database setup (Neon + Drizzle)
- Basic admin UI
- Middleware for route protection

**Key Files:**
- `src/lib/auth.ts`
- `src/app/login/page.tsx`
- `middleware.ts`
- `drizzle/schema.ts`

**ADRs Created:**
- ADR 0001: Use Drizzle ORM
- ADR 0002: JWT Authentication
- ADR 0003: Neon PostgreSQL

**Impact:** Solid foundation for rapid feature development

---

### Sprint 2: Customers & Visits (Dec 20, 2025 - Jan 9, 2026) ✅
**Status:** ✅ COMPLETED  
**Goal:** Core customer management & visit scheduling

**Delivered:**
- Trial customer management
- Subscription customer management
- Trial-to-paid conversion flow
- Visit scheduling system
- Recurring schedule support
- Customer list with filters
- Mitra assignment (Feedback 2a, 2b implemented)

**Key Features:**
- Create trial customers
- Convert trials to subscriptions
- Schedule cleaning visits
- No geographic filters (2a)
- No schedule restrictions (2b)

**Database Schema:**
- `customers` table
- `subscriptions` table
- `scheduled_visits` table
- `trial_dates` table

**Impact:** 
- Full customer lifecycle management
- 2/10 client feedback items completed

---

### Sprint 3: Attendance & Payout Core (Jan 10-24, 2026) ✅
**Status:** ✅ COMPLETED  
**Goal:** Attendance tracking & payout calculation foundation

**Delivered:**
- Attendance tracking system
- Clock in/out functionality
- Pro-rate payout calculation (Feedback 8a, 1a)
- Individual mitra rates (Feedback 1c)
- Monthly payout reports
- Payout slip view

**Key Achievements:**
- Asia/Jakarta timezone enforced (ADR 0005)
- Pro-rate formula implemented correctly
- Client's example scenario verified
- 3/10 client feedback items completed

**Database Schema:**
- `attendance_records` table
- `payouts` table

**ADRs Created:**
- ADR 0004: Pro-Rate Payout Calculation
- ADR 0005: Asia/Jakarta Timezone

**Impact:**
- Core business logic working
- Fair payout system operational

---

### Sprint 4: Payout Improvements (Jan 25 - Feb 3, 2026) ✅
**Status:** ✅ COMPLETED (Outstanding!)  
**Goal:** Payout system enhancements & stability

**Delivered:**
- Configurable payout rates (Feedback 1b)
- Historical visit editing (Feedback 6b)
- Payout adjustment mechanism (Feedback 8b)
- Label change: BONUS → LAINNYA (Feedback 9)
- Comprehensive documentation

**Key Achievements:**
- 9/9 planned items completed (100%)
- Zero carryover to Sprint 5
- Production-ready deployment
- 4/10 client feedback items completed
- 3 more verified (total 7/10 addressed)

**Impact:**
- **9/10 client feedback items now complete!**
- System stable and feature-rich
- Client satisfaction high

---

## Current Sprint 🔄

### Sprint 5: Trial UX & Polish (Feb 5-17, 2026) 🔄
**Status:** 🔄 IN PROGRESS (Day 3 of 12)  
**Progress:** 35%  
**Goal:** Improve trial UX & bulk operations

**Planned Items:**
1. 🔄 Trial form refactor (Feedback 3a, 3b) - 65%
2. ⏳ Remove per-line attended button (Feedback 6a) - 0%
3. ⏳ PDF payout slip (Feedback 10) - Blocked

**Target:**
- Complete 3/4 remaining client feedback items
- Polish UI/UX based on usage
- Prepare for final sprint

**Risks:**
- 🔴 PDF template delay from client

**See:** `docs/phases/current-sprint.md` for details

---

## Upcoming Sprints ⏳

### Sprint 6: Configuration & Completion (Feb 19 - Mar 3, 2026) ⏳
**Status:** ⏳ PLANNED  
**Duration:** 12 days  
**Goal:** Final client feedback items + polish

**Planned Items:**
1. Configurable subscription packages (Feedback 4a)
   - Admin UI for package CRUD
   - Price configuration
   - Add new packages dynamically

2. Same-day scheduling (Feedback 5a)
   - Allow multiple visits same day
   - Remove unique day constraint
   - Update UI to support

3. Invoice ID display (Feedback 7a)
   - Add invoice code column to customer list
   - Add to attendance history
   - Format: `INV/Cleaning/YYYY.MM.DD-####`

4. PDF export (if deferred from Sprint 5)
   - Implement PDF generation
   - Match client template

5. UI/UX Polish
   - Fix minor UI issues
   - Improve user experience
   - Mobile responsiveness check

6. Performance Optimization
   - Database query optimization
   - Index creation where needed
   - Page load time improvements

**Expected Completion:** 100% of client feedback items ✅

**Impact:**
- **All client requirements met**
- System fully polished
- Ready for expanded rollout

---

### Sprint 7: Analytics & Reporting (Mar 5-19, 2026) ⏳
**Status:** ⏳ PLANNED (Optional)  
**Goal:** Business intelligence & insights

**Planned Features:**
1. **Revenue Analytics Dashboard**
   - Monthly revenue trends
   - Revenue by package type
   - Customer growth charts
   - MRR (Monthly Recurring Revenue) tracking

2. **Customer Retention Metrics**
   - Churn rate calculation
   - Customer lifetime value (LTV)
   - Trial conversion rate
   - Retention cohorts

3. **Mitra Performance Tracking**
   - Attendance rate per mitra
   - Average hours worked
   - Customer satisfaction scores (if implemented)
   - Performance comparisons

4. **Business Insights**
   - Peak booking times
   - Most popular packages
   - Geographic analysis (if data available)
   - Predictive analytics (trial conversion)

**Priority:** Medium (nice-to-have, not critical)

---

### Sprint 8: Mobile App Foundation (Mar 20 - Apr 10, 2026) 💭
**Status:** 💭 IDEATION  
**Goal:** Start mobile app for mitras

**Planned Work:**
1. **Tech Stack Decision**
   - React Native vs Flutter
   - Expo vs bare workflow
   - State management approach

2. **MVP Mobile Features**
   - Mitra login
   - View schedule
   - Clock in/out
   - View payout slips
   - Basic profile

3. **API Updates**
   - Mobile-friendly endpoints
   - Token refresh mechanism
   - Push notification support

**Priority:** Low (future enhancement)

---

## Future Enhancements 💭

### Phase: Advanced Features (Apr 2026+)

**Not Yet Scheduled:**

#### 1. Customer Portal
- Customer login system
- View cleaning history
- Reschedule visits
- Make payments online
- Rate mitra performance

**Effort:** 3-4 weeks  
**Priority:** Medium

---

#### 2. Automated Notifications
- SMS reminders for visits
- Email notifications for invoices
- WhatsApp integration
- Push notifications (mobile app)

**Effort:** 2-3 weeks  
**Priority:** Medium

---

#### 3. Payment Gateway Integration
- Xendit or Midtrans integration
- Automatic payment collection
- Invoice generation
- Payment reconciliation

**Effort:** 2-3 weeks  
**Priority:** High (for scale)

---

#### 4. Advanced Scheduling
- Route optimization for mitras
- Auto-scheduling based on availability
- Calendar sync (Google Calendar)
- Buffer time management

**Effort:** 3-4 weeks  
**Priority:** Low

---

#### 5. Inventory Management
- Track cleaning supplies
- Reorder alerts
- Supply usage per visit
- Cost tracking

**Effort:** 2-3 weeks  
**Priority:** Low

---

#### 6. Team Expansion Features
- Multiple team management
- Territory assignment
- Team leader roles
- Performance dashboards

**Effort:** 3-4 weeks  
**Priority:** Low

---

#### 7. CRM Features
- Lead management
- Sales pipeline
- Follow-up reminders
- Referral tracking

**Effort:** 4-5 weeks  
**Priority:** Low

---

## Client Feedback Progress Tracking

### From Jan 3, 2026 Meeting

**Total Items:** 10 main items, 15 sub-items

| # | Item | Status | Sprint |
|---|------|--------|--------|
| 1a | Per-month base rate | ✅ Done | Sprint 3 |
| 1b | Configurable rates | ✅ Done | Sprint 4 |
| 1c | Different mitra rates | ✅ Done | Sprint 3 |
| 2a | No district filter | ✅ Done | Sprint 2 |
| 2b | No schedule restriction | ✅ Done | Sprint 2 |
| 3a | Single date trial | 🔄 In Progress | Sprint 5 |
| 3b | Unlimited trials | 🔄 In Progress | Sprint 5 |
| 4a | Configurable packages | ⏳ Planned | Sprint 6 |
| 5a | Same-day scheduling | ⏳ Planned | Sprint 6 |
| 6a | Remove attended button | ⏳ Planned | Sprint 5 |
| 6b | Historical editing | ✅ Done | Sprint 4 |
| 7a | Invoice ID display | ⏳ Planned | Sprint 6 |
| 8a | Pro-rate calculation | ✅ Done | Sprint 3 |
| 8b | Payout adjustments | ✅ Done | Sprint 4 |
| 9 | BONUS → LAINNYA | ✅ Done | Sprint 4 |
| 10 | PDF payout slip | 🔄 In Progress | Sprint 5 |

**Summary:**
- ✅ Completed: 9/15 (60%)
- 🔄 In Progress: 3/15 (20%)
- ⏳ Planned: 3/15 (20%)

**Target:** 100% by end of Sprint 6 (Mar 3, 2026)

---

## Technology Stack Evolution

### Current Stack (Stable)
- **Frontend:** Next.js 14, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, JWT Auth
- **Database:** Neon PostgreSQL, Drizzle ORM
- **Deployment:** Vercel/Railway (TBD in docs)
- **Monitoring:** (To be added)

### Planned Additions
- **PDF Generation:** react-pdf or pdfmake (Sprint 5/6)
- **Analytics:** Chart.js or Recharts (Sprint 7)
- **Mobile:** React Native + Expo (Sprint 8)
- **Payment:** Xendit/Midtrans (Future)
- **Notifications:** Twilio/MessageBird (Future)

---

## Success Metrics

### MVP Success Criteria (Sprint 6 Completion)
- [ ] All client feedback items implemented (15/15)
- [ ] Zero critical bugs in production
- [ ] System used daily by client
- [ ] Positive client feedback received
- [ ] Documentation complete
- [ ] Deployment automated
- [ ] Monitoring in place

### Business Metrics (6 Months Post-MVP)
- [ ] 50+ active customers managed
- [ ] 10+ mitras tracked
- [ ] 500+ visits completed
- [ ] 100+ payouts generated
- [ ] <1% error rate in payouts
- [ ] <2 second page load times

---

## Risk & Mitigation

### Technical Risks

**1. Database Performance** 🟡 Medium
- **Risk:** Slow queries as data grows
- **Mitigation:** 
  - Add indexes proactively
  - Monitor slow queries
  - Optimize in Sprint 6
- **Status:** Monitoring

**2. Timezone Bugs** 🟢 Low
- **Risk:** Date/time calculation errors
- **Mitigation:**
  - Asia/Jakarta enforced everywhere
  - Comprehensive testing
  - ADR documented
- **Status:** Controlled

**3. Payment Integration** 🟡 Medium (Future)
- **Risk:** Complex integration
- **Mitigation:**
  - Use well-documented gateway
  - Sandbox testing first
  - Phased rollout
- **Status:** Future concern

### Business Risks

**1. Scope Creep** 🟡 Medium
- **Risk:** Client requests keep growing
- **Mitigation:**
  - Clear prioritization
  - Sprint planning discipline
  - "Not now" list maintained
- **Status:** Managed

**2. Resource Constraints** 🟢 Low
- **Risk:** Solo developer (Handi)
- **Mitigation:**
  - Clear documentation
  - Modular architecture
  - Easy to onboard help if needed
- **Status:** Acceptable for now

---

## Decision Points

### End of Sprint 6 (Mar 3, 2026)
**Decision:** Continue to Sprint 7 or pause for evaluation?

**Factors:**
- All client feedback complete?
- Client satisfaction level?
- System stability?
- Budget/resources available?

**Options:**
1. **Continue to Sprint 7** (Analytics) - If client wants more
2. **Maintenance Mode** - If satisfied with current features
3. **Pivot to Mobile** - If mobile app priority increases

---

## Long-Term Vision (1 Year+)

### Vision Statement
"HOMA becomes the comprehensive platform for managing cleaning service operations, from customer acquisition through payment collection, with minimal manual intervention."

### Key Pillars

**1. Automation**
- Auto-scheduling based on AI/ML
- Automated payment collection
- Automated inventory reordering
- Automated customer communication

**2. Intelligence**
- Predictive analytics
- Churn prediction
- Revenue forecasting
- Optimal pricing recommendations

**3. Scale**
- Multi-branch support
- Franchise management
- White-label options
- API for partners

**4. Mobile-First**
- Full mobile app for mitras
- Customer mobile app
- Manager mobile dashboard
- Offline support

---

## Governance

### Roadmap Review Cycle
**Frequency:** Monthly (or after each sprint)  
**Owner:** Handi  
**Stakeholders:** Client, Team

**Review Process:**
1. Evaluate completed sprint
2. Review upcoming sprint plans
3. Adjust priorities based on:
   - Client feedback
   - System usage data
   - Technical challenges
   - Business needs
4. Update this roadmap
5. Communicate changes

### Change Request Process
**For Adding New Features:**
1. Document request
2. Estimate effort
3. Prioritize against existing backlog
4. Client approval (if budget impact)
5. Schedule in appropriate sprint

**For Urgent Changes:**
- Can interrupt current sprint if critical
- Requires client approval
- Document impact on timeline

---

## Related Documents

- **Current Sprint:** `docs/phases/current-sprint.md`
- **Sprint Retrospectives:** `docs/phases/sprint-*-completed.md`
- **Client Feedback:** `docs/client/feedback-tracking.md`
- **Feature Docs:** `docs/features/*.md`
- **Architecture:** `ARCHITECTURE.md`

---

**Last Updated:** January 29, 2026  
**Next Review:** February 17, 2026 (End of Sprint 5)  
**Maintained By:** Handi

---

## Quick Reference

**Current Phase:** Core Features + Polish  
**Overall Progress:** 60% (client feedback basis)  
**Current Sprint:** Sprint 5 (Trial UX)  
**Next Milestone:** Sprint 6 completion (100% client feedback)  
**MVP Target:** March 31, 2026  
**Status:** 🟢 On Track