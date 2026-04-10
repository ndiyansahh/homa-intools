# Invoice Period Splitting

**Status:** Implemented
**Created:** 2026-04-07
**Related Files:**
- `/src/lib/utils/periodSplitter.ts` - Core implementation
- `/src/lib/utils/__tests__/periodSplitter.test.ts` - Test suite
- `/src/lib/utils/periodSplitter.example.ts` - Usage examples

---

## Problem Statement

Mitra (cleaners) are paid monthly, but invoice periods for customers can span across calendar months. We need to split payouts proportionally based on visit distribution.

### Example from Image #2:

**Invoice Period:** 6-Jan to 5-Feb (30 days)
**Total Visits:** 4
**Monthly Rate:** Rp 1,200,000

**Visit Distribution:**
- January (6-Jan to 31-Jan): 3 visits = 75%
- February (1-Feb to 5-Feb): 1 visit = 25%

**Payout Split:**
- January: Rp 900,000 (75% of Rp 1,200,000)
- February: Rp 300,000 (25% of Rp 1,200,000)

---

## Solution

### Core Function

```typescript
splitPayoutAcrossMonths(
  invoicePeriod: { start: Date, end: Date },
  totalPayout: number,
  visits: Visit[],
  invoicePeriodId: string
): MonthlyPayout[]
```

### Algorithm

1. **Group visits by calendar month**
   - Extract month/year from each visit's `scheduledDate`
   - Group into Map<"YYYY-MM", Visit[]>

2. **Calculate proportion per month**
   - `percentage = (monthVisits / totalVisits) × 100`
   - `amount = (monthVisits / totalVisits) × totalPayout`

3. **Handle rounding**
   - Round amounts to nearest integer
   - Adjust largest payout if total doesn't match exactly

4. **Return sorted results**
   - Sort by year then month (chronological order)

---

## Usage

### Basic Example

```typescript
import { splitPayoutAcrossMonths } from '@/lib/utils/periodSplitter'

const invoicePeriod = {
  start: new Date('2026-01-06'),
  end: new Date('2026-02-05')
}

const visits = [
  { scheduledDate: new Date('2026-01-08') },
  { scheduledDate: new Date('2026-01-15') },
  { scheduledDate: new Date('2026-01-22') },
  { scheduledDate: new Date('2026-02-01') }
]

const result = splitPayoutAcrossMonths(
  invoicePeriod,
  1_200_000, // Rp 1.2M
  visits,
  'INV-2026-001'
)

// Returns:
// [
//   {
//     month: 1,
//     year: 2026,
//     amount: 900_000,
//     visitCount: 3,
//     percentage: 75,
//     invoicePeriodId: 'INV-2026-001'
//   },
//   {
//     month: 2,
//     year: 2026,
//     amount: 300_000,
//     visitCount: 1,
//     percentage: 25,
//     invoicePeriodId: 'INV-2026-001'
//   }
// ]
```

### With Payout Calculation

```typescript
import { splitPayoutAcrossMonths } from '@/lib/utils/periodSplitter'

// 1. Calculate total payout (pro-rate formula)
const totalPayout = Math.round(
  (actualVisits.length / scheduledVisits) * monthlyRate
)

// 2. Split across months
const monthlyPayouts = splitPayoutAcrossMonths(
  invoicePeriod,
  totalPayout,
  actualVisits,
  invoicePeriodId
)

// 3. Save to database
await db.insert(payoutTable).values(
  monthlyPayouts.map(p => ({
    mitraId: mitra.id,
    invoicePeriodId: p.invoicePeriodId,
    month: p.month,
    year: p.year,
    amount: p.amount,
    visitCount: p.visitCount,
    percentage: p.percentage
  }))
)
```

---

## Edge Cases

### 1. Single Month Period

**Input:** Period 6-Jan to 31-Jan (all visits in January)

**Output:** 100% to January

```typescript
[
  {
    month: 1,
    year: 2026,
    amount: 1_200_000,
    visitCount: 4,
    percentage: 100,
    invoicePeriodId: 'INV-001'
  }
]
```

### 2. Three Month Period

**Input:** Period 31-Jan to 30-Mar

**Visits:**
- Jan: 1 visit (12.5%)
- Feb: 4 visits (50%)
- Mar: 3 visits (37.5%)

**Output:** Split across 3 months proportionally

### 3. Zero Visits

**Input:** No visits in period

**Output:** Single entry with 0 amount for start month

```typescript
[
  {
    month: 1,
    year: 2026,
    amount: 0,
    visitCount: 0,
    percentage: 0,
    invoicePeriodId: 'INV-001'
  }
]
```

---

## Helper Functions

### `groupVisitsByMonth(visits: Visit[]): Map<string, Visit[]>`

Groups visits by calendar month.

```typescript
const grouped = groupVisitsByMonth(visits)
// Returns: Map {
//   '2026-01' => [visit1, visit2, visit3],
//   '2026-02' => [visit4]
// }
```

### `getMonthYearFromDate(date: Date): {month: number, year: number}`

Extracts month/year in Jakarta timezone.

```typescript
const monthYear = getMonthYearFromDate(new Date('2026-01-15'))
// Returns: { month: 1, year: 2026 }
```

### `formatMonthlyPayout(payout: MonthlyPayout): string`

Formats payout for display.

```typescript
const formatted = formatMonthlyPayout({
  month: 1,
  year: 2026,
  amount: 750_000,
  visitCount: 3,
  percentage: 75,
  invoicePeriodId: 'INV-001'
})
// Returns: "Jan 2026: Rp750,000 (3 visits, 75%)"
```

### `validatePeriodVisits(period, visits): {valid: boolean, errors: string[]}`

Validates period and visits consistency.

```typescript
const validation = validatePeriodVisits(invoicePeriod, visits)
if (!validation.valid) {
  console.error('Errors:', validation.errors)
}
```

---

## Testing

Comprehensive test suite in `/src/lib/utils/__tests__/periodSplitter.test.ts`

**Test Coverage:**
- ✅ Basic 2-month split (Image #2 scenario)
- ✅ Single month period (100% to one month)
- ✅ Three month period (edge case)
- ✅ Zero visits edge case
- ✅ Rounding error handling
- ✅ Date extraction and grouping
- ✅ Validation logic

**Run tests:**
```bash
npm test periodSplitter
```

---

## Integration Points

### 1. Payout Calculation API

**Location:** `/src/app/api/payouts/calculate/route.ts` (to be created)

**Flow:**
1. Fetch invoice period + visits
2. Calculate total payout (pro-rate formula)
3. Split across months using `splitPayoutAcrossMonths()`
4. Save monthly payout records to DB

### 2. Payout Report

**Location:** `/src/app/app/payouts/` (to be created)

**Display:**
- Show monthly breakdown for each mitra
- Allow filtering by month/year
- Export to PDF with monthly splits

### 3. Database Schema

**New table:** `monthly_payout` (to be added)

```typescript
export const monthlyPayoutTable = pgTable('monthly_payout_db', {
  id: text('id').primaryKey(),
  mitraId: text('mitra_id').notNull().references(() => userTable.id),
  invoicePeriodId: text('invoice_period_id').notNull(),
  month: integer('month').notNull(), // 1-12
  year: integer('year').notNull(),
  amount: integer('amount').notNull(),
  visitCount: integer('visit_count').notNull(),
  percentage: real('percentage').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
})
```

---

## Important Notes

### 1. Timezone Handling

**CRITICAL:** Always use `toJakartaTime()` from `/src/lib/date-utils.ts`

The utility already handles this internally:
```typescript
const jakartaDate = toJakartaTime(visit.scheduledDate)
```

### 2. Pro-Rate Formula

Period splitting is **separate** from pro-rate calculation:

1. **First:** Calculate total payout using pro-rate formula
   ```typescript
   totalPayout = (actualVisits / scheduledVisits) × monthlyRate
   ```

2. **Then:** Split total across months
   ```typescript
   monthlyPayouts = splitPayoutAcrossMonths(period, totalPayout, visits, id)
   ```

### 3. Rounding

Amounts are rounded to nearest integer (no decimals in IDR).

Rounding errors are automatically adjusted by adding/subtracting difference to the month with most visits.

### 4. Database Consistency

When saving monthly payouts:
- Sum of all `amount` must equal total payout
- Sum of all `visitCount` must equal total visits
- Sum of all `percentage` should equal ~100% (allow small floating point differences)

---

## Next Steps

1. **Create database migration** for `monthly_payout` table
2. **Update payout calculation API** to use period splitting
3. **Add monthly payout view** in frontend
4. **Update PDF export** to show monthly breakdown
5. **Add migration script** to split existing payouts retroactively (if needed)

---

## Questions?

See usage examples in `/src/lib/utils/periodSplitter.example.ts`

Run examples:
```typescript
import { runAllExamples } from '@/lib/utils/periodSplitter.example'
runAllExamples()
```
