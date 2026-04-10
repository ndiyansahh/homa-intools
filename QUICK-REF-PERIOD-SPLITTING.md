# Quick Reference: Period Splitting

> **TL;DR:** Split invoice period payouts across calendar months based on visit distribution

---

## 🚀 Quick Start

```typescript
import { splitPayoutAcrossMonths } from '@/lib/utils/periodSplitter'

const result = splitPayoutAcrossMonths(
  { start: new Date('2026-01-06'), end: new Date('2026-02-05') },
  1_200_000, // Total payout
  visits,    // Visit array
  'INV-001'  // Invoice period ID
)

// Returns:
// [
//   { month: 1, year: 2026, amount: 900_000, visitCount: 3, percentage: 75, ... },
//   { month: 2, year: 2026, amount: 300_000, visitCount: 1, percentage: 25, ... }
// ]
```

---

## 📁 Files

| File | Purpose |
|------|---------|
| `/src/lib/utils/periodSplitter.ts` | Core functions |
| `/src/lib/utils/periodSplitter.example.ts` | Usage examples |
| `/src/lib/utils/__tests__/periodSplitter.test.ts` | Tests |
| `/src/types/payout.ts` | Type definitions |
| `/docs/features/invoice-period-splitting.md` | Full docs |

---

## 🔑 Key Functions

### `splitPayoutAcrossMonths()`
Main function - splits payout across months
```typescript
splitPayoutAcrossMonths(
  period: { start: Date, end: Date },
  totalPayout: number,
  visits: Visit[],
  invoicePeriodId: string
): MonthlyPayout[]
```

### `groupVisitsByMonth()`
Group visits by calendar month
```typescript
groupVisitsByMonth(visits: Visit[]): Map<string, Visit[]>
```

### `validatePeriodVisits()`
Validate period and visits
```typescript
validatePeriodVisits(
  period: { start: Date, end: Date },
  visits: Visit[]
): { valid: boolean, errors: string[] }
```

### `formatMonthlyPayout()`
Format for display
```typescript
formatMonthlyPayout(payout: MonthlyPayout): string
// Returns: "Jan 2026: Rp750,000 (3 visits, 75%)"
```

---

## 💡 Example (Image #2)

**Period:** 6-Jan to 5-Feb
**Visits:** 4 total (3 in Jan, 1 in Feb)
**Payout:** Rp 1,200,000

**Result:**
- Jan: Rp 900,000 (75%)
- Feb: Rp 300,000 (25%)

---

## ⚙️ How It Works

1. Group visits by month → `Map<"YYYY-MM", Visit[]>`
2. Calculate proportion → `visits_in_month / total_visits`
3. Calculate amount → `proportion × total_payout`
4. Handle rounding → Adjust largest payout if needed
5. Return sorted → By year then month

---

## 🧪 Testing

```bash
npm test periodSplitter
```

---

## 📚 Full Documentation

See: `/docs/features/invoice-period-splitting.md`

---

## ⚠️ Important

- Uses Jakarta timezone (`toJakartaTime()`)
- Separate from pro-rate calculation
- Auto-handles rounding errors
- Supports 1-3 month periods

---

## 🔗 Integration Flow

1. Calculate total payout (pro-rate formula)
2. Split across months (this utility)
3. Save to database
4. Display in UI

---

**Updated:** 2026-04-07
