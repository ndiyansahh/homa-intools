# ADR 0004: Pro-Rate Payout Calculation Logic

**Date:** 2025-01-22  
**Status:** ✅ Accepted  
**Deciders:** Handi, Client, Team  
**Tags:** business-logic, payout, calculation

---

## Context

We needed to define how to calculate mitra (staff) monthly payouts fairly when:
1. Mitras don't always attend all scheduled visits
2. Invoice periods don't align with calendar months
3. Attendance can be edited historically (after payout calculated)

**Business Requirements:**
- Fair compensation based on actual work
- Handle partial months correctly
- Handle invoice periods that span 2 calendar months
- Support historical corrections

**Client Feedback (Jan 3, 2026 Meeting):**
> "Perhitungan payout (payout logic) → prorate dari berapa kali datang di bulan itu dibagi harusnya dari start s/d end period invoice tersebut ada berapa kali kedatangan dikali payout rate sebulan dari mitra tersebut."

---

## Decision

We chose **Pro-Rate Calculation** based on actual attendance ratio.

### Formula
```
Monthly Payout = (Actual Attended Visits / Scheduled Visits in Period) × Monthly Base Rate
```

### Key Rules

1. **Monthly Base Rate:** Mitra has fixed monthly rate (not per-visit)
2. **Pro-Rate by Attendance:** Payout proportional to attendance
3. **Period-Based:** Calculate per calendar month, even if invoice spans 2 months
4. **Actual vs Scheduled:** Use scheduled visits in period (not total monthly visits)

---

## Consequences

### Positive ✅

**1. Fair to All Parties**
- Mitra paid for work actually done
- Company doesn't overpay for missed visits
- Predictable monthly rate for mitras
- Transparent calculation

**2. Handles Complex Scenarios**

**Scenario 1: Full Month**
```
Invoice: Jan 1 - Jan 31 (full month)
Schedule: 2x/week = 8 visits
Attended: 8/8
Base Rate: Rp 900,000

Payout = 8/8 × 900,000 = Rp 900,000 ✅
```

**Scenario 2: Partial Month**
```
Invoice: Jan 15 - Feb 14
Schedule: 2x/week (Rabu & Sabtu)
Jan visits: 4
Feb visits: 4
Total: 8 visits
Base Rate: Rp 900,000

Jan Payout = 4/8 × 900,000 = Rp 450,000
Feb Payout = 4/8 × 900,000 = Rp 450,000
Total: Rp 900,000 ✅
```

**Scenario 3: Missed Visits**
```
Invoice: Jan 1 - Jan 31
Schedule: 8 visits
Attended: 6/8 (missed 2)
Base Rate: Rp 900,000

Payout = 6/8 × 900,000 = Rp 675,000 ✅
(-Rp 225,000 from full rate)
```

**Scenario 4: Client Example (from PDF)**
```
Invoice: Jan 7 - Feb 6, 2026
Schedule: Rabu (Wed) & Sabtu (Sat)
Base Rate: Rp 900,000/month

Jan 2026 scheduled visits:
- Jan 8, 11, 15, 18, 22, 25, 29 Feb 1
- Total: 8 visits in Jan

Feb 2026 scheduled visits:
- Feb 5
- Total: 1 visit in Feb

Total period: 9 visits (8 in Jan + 1 in Feb)

Jan Payout = 8/9 × 900,000 = Rp 800,000 ✅
Feb Payout = 1/9 × 900,000 = Rp 100,000 ✅
```

**3. Historical Edit Support**
When attendance edited after payout:
```
Original (Jan):
- Paid for 8 visits = Rp 800,000

Later discovered:
- 31-Jan didn't actually attend
- Overpaid: 1/9 × 900,000 = Rp 100,000

Feb Payout:
- Base: 2 visits = 2/9 × 900,000 = Rp 200,000
- Adjustment: -Rp 100,000
- Final: Rp 100,000 ✅
```

**4. Clear Audit Trail**
- Every calculation logged
- Formula transparent
- Easy to verify
- Client can check math

---

### Negative ⚠️

**1. Complexity in Implementation**
```typescript
// Need to handle:
- Period spanning 2 months
- Count visits per calendar month
- Group by mitra
- Handle adjustments
- Maintain audit trail
```

**2. Edge Cases to Handle**
- Zero scheduled visits in month (shouldn't happen, but...)
- All visits missed (payout = Rp 0)
- Visits scheduled but customer cancelled (count or not?)
- Historical edits creating negative adjustments

**3. Month-End Timing Issues**
- Payouts can't be final until month completely over
- Need to wait for all visits to complete
- Historical edits can affect "closed" months

---

## Alternatives Considered

### Alternative 1: Per-Visit Rate
**Formula:** `Payout = Attended Visits × Per-Visit Rate`

**Example:**
```
Per-visit rate: Rp 112,500 (900,000 / 8 visits)
Attended: 6 visits
Payout = 6 × 112,500 = Rp 675,000
```

**Pros:**
- Simpler calculation
- No need to count scheduled visits
- Easy to understand

**Cons:**
- ❌ **Doesn't handle partial months well**
- ❌ **Client rejected this approach (feedback 1a)**
- ❌ **Variable schedule makes per-visit rate unclear**
- ❌ **Harder to budget for mitras (monthly income varies too much)**

**Why Rejected:** Client explicitly requested per-month basis, not per-visit.

---

### Alternative 2: Fixed Monthly Salary
**Formula:** `Payout = Monthly Base Rate (always)`

**Example:**
```
Attended: 6/8 visits
Payout = Rp 900,000 (regardless)
```

**Pros:**
- Simplest calculation
- Predictable income for mitras
- No complex math

**Cons:**
- ❌ **Unfair to company (paying for missed work)**
- ❌ **No incentive for attendance**
- ❌ **Doesn't match client requirements**

**Why Rejected:** Not fair to company. Need attendance-based calculation.

---

### Alternative 3: Percentage-Based Bonus
**Formula:** `Base Salary + Bonus for Attendance %`

**Example:**
```
Base: Rp 700,000 (guaranteed)
Bonus: Rp 200,000 × (Attended/Scheduled)

Attended 6/8:
Payout = 700,000 + (200,000 × 6/8) = Rp 850,000
```

**Pros:**
- Guaranteed base income
- Incentivizes attendance
- Less dramatic drops for missed visits

**Cons:**
- ❌ **More complex to explain**
- ❌ **Not what client requested**
- ❌ **Need to define base vs bonus split**

**Why Rejected:** Over-complicated. Client wants simple pro-rate.

---

## Implementation Details

### Code Structure
```typescript
// src/lib/payout-calculator.ts

interface PayoutCalculationInput {
  mitraId: number;
  periodMonth: string;  // YYYY-MM
  baseRateMonthly: number;
}

interface PayoutCalculationResult {
  mitraId: number;
  periodMonth: string;
  baseRate: number;
  scheduledVisits: number;
  actualVisits: number;
  calculatedAmount: number;
  prorationRatio: number;
}

export async function calculateMonthlyPayout(
  input: PayoutCalculationInput
): Promise<PayoutCalculationResult> {
  const { mitraId, periodMonth, baseRateMonthly } = input;
  
  // 1. Get all scheduled visits in this calendar month
  const scheduledVisits = await getScheduledVisitsInMonth(
    mitraId, 
    periodMonth
  );
  
  // 2. Get actual attended visits
  const actualVisits = await getAttendedVisitsInMonth(
    mitraId, 
    periodMonth
  );
  
  // 3. Calculate pro-rate
  const prorationRatio = actualVisits.length / scheduledVisits.length;
  const calculatedAmount = Math.round(baseRateMonthly * prorationRatio);
  
  return {
    mitraId,
    periodMonth,
    baseRate: baseRateMonthly,
    scheduledVisits: scheduledVisits.length,
    actualVisits: actualVisits.length,
    calculatedAmount,
    prorationRatio
  };
}
```

### Database Storage
```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  mitra_id INTEGER,
  period_month VARCHAR(7),  -- 'YYYY-MM'
  base_rate DECIMAL(10,2),
  scheduled_visits INTEGER,  -- Store for audit
  actual_visits INTEGER,     -- Store for audit
  calculated_amount DECIMAL(10,2),
  adjustment DECIMAL(10,2) DEFAULT 0,
  final_amount DECIMAL(10,2),
  ...
);
```

---

## Testing Strategy

### Unit Tests
```typescript
describe('Payout Calculator', () => {
  test('Full month, 100% attendance', () => {
    const result = calculatePayout({
      baseRate: 900000,
      scheduled: 8,
      attended: 8
    });
    expect(result).toBe(900000);
  });
  
  test('Partial attendance', () => {
    const result = calculatePayout({
      baseRate: 900000,
      scheduled: 8,
      attended: 6
    });
    expect(result).toBe(675000);
  });
  
  test('Client example (Jan 7 - Feb 6)', () => {
    const janResult = calculatePayout({
      baseRate: 900000,
      scheduled: 9,
      attended: 8
    });
    expect(janResult).toBe(800000);
    
    const febResult = calculatePayout({
      baseRate: 900000,
      scheduled: 9,
      attended: 1
    });
    expect(febResult).toBe(100000);
  });
});
```

### Integration Tests
- Create customer with subscription
- Schedule visits across 2 months
- Mark some as attended
- Calculate payout
- Verify amounts match expected

---

## Edge Cases Handled

### 1. Zero Scheduled Visits
```typescript
if (scheduledVisits === 0) {
  return {
    calculatedAmount: 0,
    note: 'No scheduled visits in period'
  };
}
```

### 2. All Visits Missed
```typescript
if (actualVisits === 0) {
  return {
    calculatedAmount: 0,
    note: 'No attendance in period'
  };
}
```

### 3. Over-Attendance (shouldn't happen)
```typescript
if (actualVisits > scheduledVisits) {
  // Log error, cap at 100%
  const cappedVisits = scheduledVisits;
  return calculatePayout(baseRate, scheduledVisits, cappedVisits);
}
```

### 4. Rounding
```typescript
// Always round to nearest Rupiah
const amount = Math.round(baseRate * ratio);
```

---

## Documentation Requirements

**Required Documentation:**
1. ✅ ADR (this file)
2. ✅ Feature Doc (`docs/features/payout-system.md`)
3. ✅ Code comments in calculator
4. ✅ Test scenarios (`TEST_SCENARIO_1a_1b_1c.csv`)
5. ✅ Client examples documented

---

## Business Impact

### For Mitras
- **Predictable:** Know base monthly rate
- **Fair:** Paid for actual work
- **Transparent:** Can verify calculation
- **Incentive:** Encourages good attendance

### For Company
- **Cost Control:** Only pay for work done
- **Fair:** Not overpaying for absences
- **Flexibility:** Can adjust rates per mitra
- **Audit Trail:** Clear records for accounting

### For Management
- **Reporting:** Easy to generate payout reports
- **Forecasting:** Predictable monthly costs
- **Adjustments:** Historical edits supported
- **Compliance:** Clear calculation methodology

---

## Related Decisions

- **ADR 0005:** Asia/Jakarta Timezone (affects visit dates)
- **Client Feedback 1a, 1b, 8a, 8b:** Direct requirements for this logic

---

## References

- Client Meeting Notes: `docs/client/meeting-notes/2026-01-03-review.md`
- Payout Feature Doc: `docs/features/payout-system.md`
- Test Scenarios: `TEST_SCENARIO_1a_1b_1c.csv` (root)

---

## Review

**Next Review:** 2026-03-01 (after 2 months production use)  
**Success Metrics:**
- Zero calculation disputes
- Client satisfaction
- Mitra understanding of calculation
- Audit accuracy

**Potential Adjustments:**
- Bonus structure addition (if requested)
- Holiday handling (if needed)
- Overtime calculation (future)

---

**Last Updated:** 2025-01-22  
**Author:** Handi  
**Approved By:** Client (Jan 3, 2026 meeting)