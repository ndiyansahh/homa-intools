# Sprint 3: Attendance & Core Payout System (COMPLETED ✅)

**Duration:** January 10 - January 24, 2026 (14 days)  
**Status:** ✅ COMPLETED  
**Final Progress:** 100% (All core features delivered)  
**Deployed:** Production (January 25, 2026)

---

## Sprint Summary

**Goal:** Build complete attendance tracking system and implement core payout calculation logic.

**Outcome:** 🎉 **Success**
- Attendance system fully functional
- Pro-rate payout calculation implemented
- Individual mitra rates supported
- Foundation for future payout improvements
- Deployed to production successfully

---

## Completed Items

### ✅ 1. Attendance Tracking System
**Priority:** 🔴 High  
**Completed:** January 20, 2026  
**Effort:** 8 days

**Delivered:**
- Clock in/out functionality
- GPS location capture (optional)
- Photo upload for verification (optional)
- Attendance history view
- Monthly attendance reports
- Integration with scheduled visits

**Database Schema:**
```sql
CREATE TABLE attendance_records (
  id SERIAL PRIMARY KEY,
  mitra_id INTEGER REFERENCES mitras(id),
  scheduled_visit_id INTEGER REFERENCES scheduled_visits(id),
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  clock_in_lat DECIMAL(10, 8),
  clock_in_lng DECIMAL(11, 8),
  clock_out_lat DECIMAL(10, 8),
  clock_out_lng DECIMAL(11, 8),
  clock_in_photo_url TEXT,
  clock_out_photo_url TEXT,
  status VARCHAR(20) DEFAULT 'clocked_in',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Files Created:**
- `src/app/app/attendance/page.tsx`
- `src/app/api/attendance/clock-in/route.ts`
- `src/app/api/attendance/clock-out/route.ts`
- `src/app/api/attendance/history/route.ts`
- `src/components/attendance-card.tsx`

**Impact:**
- Mitras can track their work hours
- Automatic visit completion tracking
- Audit trail for all attendance
- Foundation for payout calculation

**Testing:**
- ✅ Clock in/out flow tested
- ✅ GPS capture working
- ✅ Photo upload tested
- ✅ Timezone handling verified (Asia/Jakarta)

---

### ✅ 2. Pro-Rate Payout Calculation (Feedback 8a, 1a)
**Priority:** 🔴 High  
**Completed:** January 22, 2026  
**Effort:** 4 days

**Delivered:**
- Core payout calculation logic
- Pro-rate formula implementation
- Month-based calculation (not per-visit)
- Handle partial months correctly
- Support for invoice periods spanning 2 months

**Formula Implemented:**
```typescript
monthly_payout = (actual_visits / scheduled_visits) × base_rate_monthly
```

**Files Created:**
- `src/lib/payout-calculator.ts` (core logic)
- `src/app/api/payouts/calculate/route.ts`
- `src/app/api/payouts/generate/route.ts`

**Example Verified:**
```
Invoice: Jan 7 - Feb 6 (Rabu & Sabtu)
Monthly Rate: Rp 900,000
Total scheduled: 9 visits (8 Jan + 1 Feb)

Jan Payout: 8/9 × 900,000 = Rp 800,000 ✅
Feb Payout: 1/9 × 900,000 = Rp 100,000 ✅
```

**Impact:**
- Fair payout based on actual work
- Handles complex scenarios correctly
- Client's exact requirement met
- Foundation for Sprint 4 improvements

**Testing:**
- ✅ Full month scenario
- ✅ Partial month scenario
- ✅ Client's example scenario
- ✅ Edge cases (zero visits, all missed)

---

### ✅ 3. Individual Mitra Rates (Feedback 1c)
**Priority:** 🔴 High  
**Completed:** January 18, 2026  
**Effort:** 2 days

**Delivered:**
- Each mitra has `base_rate_monthly` field
- No rate locking between mitras
- Admin UI to set/edit individual rates
- Rate history tracking (for future)

**Database Changes:**
```sql
ALTER TABLE mitras 
ADD COLUMN base_rate_monthly DECIMAL(10,2) NOT NULL DEFAULT 800000;
```

**Files Modified:**
- `drizzle/schema.ts` (mitra schema)
- `src/app/app/mitras/[id]/edit/page.tsx` (rate editing)
- `src/app/api/mitras/[id]/route.ts` (update endpoint)

**Example:**
```
Mitra A (2x/week Regular): Rp 800,000/month
Mitra B (2x/week Regular): Rp 900,000/month
✅ Different rates, same package type
```

**Impact:**
- Flexibility to pay mitras differently
- Can adjust based on experience, performance
- No system constraints

---

### ✅ 4. Monthly Payout Reports
**Priority:** 🟡 Medium  
**Completed:** January 23, 2026  
**Effort:** 2 days

**Delivered:**
- Monthly payout summary view
- Filter by mitra, month, status
- Export to CSV
- Basic payout approval workflow

**Files Created:**
- `src/app/app/payouts/page.tsx`
- `src/app/api/payouts/route.ts`
- `src/components/payout-table.tsx`

**Features:**
- List all payouts for a month
- Show calculation breakdown
- Approve/mark as paid
- Export for accounting

---

### ✅ 5. Payout Slip View
**Priority:** 🟡 Medium  
**Completed:** January 24, 2026  
**Effort:** 1 day

**Delivered:**
- Individual payout slip page
- Shows mitra info, period, breakdown
- List of all visits in period
- Calculation details visible

**Files Created:**
- `src/app/app/payouts/[id]/slip.tsx`
- `src/components/payout-breakdown.tsx`

**Contains:**
- Mitra name and details
- Period (month)
- Base rate
- Scheduled vs actual visits
- Calculated amount
- BONUS field (later renamed to LAINNYA in Sprint 4)
- Final amount
- Visit list with attendance status

---

### ✅ 6. Database Schema for Payouts
**Priority:** 🔴 High  
**Completed:** January 17, 2026  
**Effort:** 1 day

**Delivered:**
```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  mitra_id INTEGER REFERENCES mitras(id),
  period_month VARCHAR(7) NOT NULL,  -- 'YYYY-MM'
  base_rate DECIMAL(10,2) NOT NULL,
  scheduled_visits INTEGER NOT NULL,
  actual_visits INTEGER NOT NULL,
  calculated_amount DECIMAL(10,2) NOT NULL,
  bonus DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  adjustment DECIMAL(10,2) DEFAULT 0,  -- Added for future
  final_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_payouts_mitra ON payouts(mitra_id);
CREATE INDEX idx_payouts_period ON payouts(period_month);
```

---

### ✅ 7. Integration Testing
**Priority:** 🔴 High  
**Completed:** January 24, 2026  
**Effort:** 1 day

**Test Scenarios:**
1. Create customer with subscription
2. Schedule visits (2x/week)
3. Mitra clocks in/out for visits
4. Generate monthly payout
5. Verify calculated amount correct
6. Export payout report

**Results:** All scenarios passed ✅

---

### ✅ 8. Documentation
**Priority:** 🟡 Medium  
**Completed:** January 24, 2026  
**Effort:** 1 day (distributed)

**Created:**
- `docs/features/attendance.md`
- `docs/features/payout-system.md` (initial version)
- Code comments in calculator
- API documentation

---

## Sprint Metrics

### Velocity

**Planned Story Points:** 18 points  
**Completed:** 18 points  
**Velocity:** 100% ✅

---

### Quality Metrics

**Bugs Found:** 3 (all fixed)
1. Timezone issue with attendance (fixed Jan 19)
2. Payout calculation rounding (fixed Jan 22)
3. UI display of decimal amounts (fixed Jan 23)

**Code Quality:**
- All code reviewed
- No major refactoring needed
- Clean architecture maintained

---

### Time Breakdown

**Actual Time:**
- Attendance system: 8 days
- Payout calculation: 4 days
- Testing & bug fixes: 1.5 days
- Documentation: 0.5 day
- **Total:** 14 days ✅

---

## What Went Well ✅

### 1. Clear Architecture
- Separated payout calculator into own module
- Easy to test and extend
- Good code organization

### 2. Timezone Handling
- Asia/Jakarta timezone enforced from start
- No date bugs in production
- ADR documented decision

### 3. Testing Approach
- Created real test scenarios
- Caught bugs before production
- Client examples verified

### 4. Foundation for Future
- Sprint 4 built easily on this foundation
- Good abstractions
- Extensible design

---

## Challenges Faced ⚠️

### 1. Timezone Complexity
**Issue:** Need to ensure all dates in Asia/Jakarta

**Solution:**
- Created date-utils.ts with timezone helpers
- All date operations use these utilities
- ADR documented decision
- See: `docs/adrs/0005-asia-jakarta-timezone.md`

**Time Impact:** +1 day

---

### 2. Pro-Rate Logic Complexity
**Issue:** Client's example (Jan 7 - Feb 6) spanning 2 months

**Challenge:**
- Need to split payout across 2 calendar months
- Count visits correctly per month
- Handle partial months

**Solution:**
- Created comprehensive calculator
- Added month boundary handling
- Tested all edge cases

**Time Impact:** +1 day

---

### 3. Attendance GPS Accuracy
**Issue:** GPS not always accurate indoors

**Solution:**
- Made GPS optional (not required)
- Admins can verify manually if needed
- Added notes field for explanations

**Time Impact:** +0.5 day

---

## Lessons Learned 📚

### Technical

1. **Timezone from Day 1**
   - Enforcing timezone early prevented bugs
   - Would be harder to fix later
   - ADR helpful for future reference

2. **Test with Real Scenarios**
   - Client's example was perfect test case
   - Found edge cases early
   - Built confidence

3. **Modular Calculator**
   - Separate calculator module good decision
   - Easy to test independently
   - Easy to extend in Sprint 4

### Process

1. **Sprint Length**
   - 14 days felt right for this scope
   - Not too rushed
   - Not too long

2. **Documentation During**
   - Updating docs while coding better
   - Fresher memory
   - Better quality

---

## Carryover to Sprint 4

**Items Deferred:**
1. Configurable payout rates (1b) - Sprint 4
2. Historical visit editing (6b) - Sprint 4
3. Payout adjustments (8b) - Sprint 4

**Reason:** Sprint 3 focused on core functionality first. Enhancements moved to Sprint 4.

---

## Production Deployment

**Deployed:** January 25, 2026  
**Status:** ✅ Successful

**Deployment Steps:**
1. Merged to main branch
2. Database migrations run
3. Smoke tests passed
4. Monitoring confirmed stable

**Post-Deployment:**
- No critical issues
- Performance acceptable
- Client using system successfully

---

## Client Impact

**After Sprint 3:**
- ✅ Attendance tracking working
- ✅ Payout calculation accurate
- ✅ Individual mitra rates supported
- ✅ Client's example scenario verified

**Client Feedback:** Positive
- System working as expected
- Calculations accurate
- UI intuitive

**Completion Rate (from Jan 3 feedback):**
- Sprint 3 addressed: 3 items (1a, 1c, 8a)
- Remaining: 7 items for Sprint 4+

---

## Next Sprint Preview

**Sprint 4 (Jan 25 - Feb 3):**
- Configurable payout rates (1b)
- Historical visit editing (6b)
- Payout adjustments (8b)
- Label change (9)
- Documentation improvements

---

## Related Documents

- **Sprint 4:** `docs/phases/sprint-4-completed.md`
- **ADR 0004:** `docs/adrs/0004-prorate-payout-calculation.md`
- **ADR 0005:** `docs/adrs/0005-asia-jakarta-timezone.md`
- **Attendance Feature:** `docs/features/attendance.md`
- **Payout Feature:** `docs/features/payout-system.md`

---

**Sprint Completed:** January 24, 2026  
**Deployed to Production:** January 25, 2026  
**Documented By:** Handi

---

## Quick Stats

**Duration:** 14 days  
**Items Completed:** 8/8 (100%)  
**Velocity:** 18 story points  
**Bugs:** 3 (all fixed)  
**Deployment:** ✅ Production (Jan 25)  
**Client Satisfaction:** High  
**Carryover:** 3 items (planned for Sprint 4)  

**Overall Grade:** A 🌟