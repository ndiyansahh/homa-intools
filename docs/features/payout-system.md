# Payout System - Complete Documentation

**Status:** ✅ Implemented (Sprint 3-4)  
**Last Updated:** 2025-01-29  
**Owner:** Handi

---

## Overview

Automated mitra (staff) payout calculation system with pro-rate logic, configurable rates, and adjustment mechanism.

---

## Current Implementation Status

### ✅ Implemented Features

#### 1. Pro-Rate Calculation (Feedback 8a)
**Completed:** Sprint 3  
**Files:**
- `src/lib/payout-calculator.ts` (lines 15-87)
- `src/app/api/payouts/calculate/route.ts`

**Formula:**
```javascript
monthly_payout = (actual_attendance / scheduled_attendance) × base_rate_monthly
```

**Example:**
```
Invoice Period: Jan 7 - Feb 6, 2026 (Rabu & Sabtu schedule)
Monthly Base Rate: Rp 900,000
Total Scheduled Visits in Period: 9 visits

Jan 2026 Calculation:
- Scheduled in Jan: 8 visits
- Payout: 8/9 × Rp 900,000 = Rp 800,000

Feb 2026 Calculation:
- Scheduled in Feb: 1 visit
- Payout: 1/9 × Rp 900,000 = Rp 100,000
```

**Test Scenarios:** See `TEST_SCENARIO_1a_1b_1c.csv` in root

---

#### 2. Configurable Base Rates (Feedback 1a, 1b)
**Completed:** Sprint 4  
**Files:**
- `src/app/app/settings/payout-rates/page.tsx`
- `src/app/api/payout-rates/*`
- Database: `payout_rate_configs` table

**Features:**
- Per-month base rates (not per-visit)
- Configurable via admin UI
- Different rates per subscription package (Basic/Regular/Frequent)
- Historical rate tracking

**UI Location:** `/app/settings/payout-rates` (ADMIN/OWNER only)

---

#### 3. Individual Mitra Rates (Feedback 1c)
**Completed:** Sprint 3  
**Files:**
- Database: `mitras` table, `base_rate_monthly` column
- UI: `src/app/app/mitras/[id]/edit/page.tsx`
- API: `PUT /api/mitras/[id]`

**Feature:**
- Each mitra can have different base rate
- No locking between mitras
- Example: Mitra A = Rp 800K/month, Mitra B = Rp 900K/month (same package type)

---

#### 4. Payout Adjustments (Feedback 8b)
**Completed:** Sprint 4  
**Files:**
- `src/lib/payout-adjustment-calculator.ts`
- `src/app/api/payouts/adjustments/*`
- Database: `payout_adjustments` table

**How It Works:**
When historical visits are edited (see `visit-tracking.md`), adjustments are automatically calculated.

**Example:**
```
Original Jan Payout (paid):
- Expected: 8 visits
- Paid: Rp 800,000

Later Discovery (31-Jan didn't actually attend):
- Actual: 7 visits
- Overpaid: 1/9 × Rp 900,000 = Rp 100,000

Feb Payout Calculation:
- Base Feb scheduled: 2 visits = Rp 200,000
- Adjustment: -Rp 100,000 (overpayment from Jan)
- Final Feb Payout: Rp 100,000
```

**Adjustment Tracking:**
- All adjustments logged in `payout_adjustments` table
- Visible in payout slip with explanation
- Audit trail maintained

---

#### 5. Label Change (Feedback 9)
**Completed:** Sprint 4  
**Files:**
- `src/app/app/payouts/[id]/slip.tsx` (line 47)
- `src/components/payout-summary-card.tsx`

**Change:** "BONUS" → "LAINNYA"

---

### ⏳ Planned Features

#### 1. PDF Payout Slip (Feedback 10)
**Target:** Sprint 5 (by Feb 17)  
**Status:** Blocked - awaiting client PDF template  
**Planned Files:**
- `src/lib/pdf-generator.ts`
- `src/app/api/payouts/[id]/pdf/route.ts`

**Dependencies:**
- PDF library selection (react-pdf vs pdfmake vs puppeteer)
- Client template design approval

---

## Database Schema

### Tables

**mitras**
```sql
CREATE TABLE mitras (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  base_rate_monthly DECIMAL(10,2) NOT NULL,  -- Per month base rate
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**payout_rate_configs**
```sql
CREATE TABLE payout_rate_configs (
  id SERIAL PRIMARY KEY,
  package_type VARCHAR(50) NOT NULL,  -- 'basic', 'regular', 'frequent'
  base_rate DECIMAL(10,2) NOT NULL,
  effective_from DATE NOT NULL,
  effective_to DATE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**payouts**
```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  mitra_id INTEGER REFERENCES mitras(id),
  period_month VARCHAR(7) NOT NULL,  -- 'YYYY-MM' format
  base_rate DECIMAL(10,2) NOT NULL,
  scheduled_visits INTEGER NOT NULL,
  actual_visits INTEGER NOT NULL,
  calculated_amount DECIMAL(10,2) NOT NULL,
  bonus DECIMAL(10,2) DEFAULT 0,        -- Now labeled as "LAINNYA"
  deductions DECIMAL(10,2) DEFAULT 0,
  adjustment DECIMAL(10,2) DEFAULT 0,   -- From payout_adjustments
  final_amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',   -- 'draft', 'approved', 'paid'
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**payout_adjustments**
```sql
CREATE TABLE payout_adjustments (
  id SERIAL PRIMARY KEY,
  payout_id INTEGER REFERENCES payouts(id),
  reason TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,       -- Positive = additional, Negative = deduction
  related_visit_id INTEGER REFERENCES scheduled_visits(id),
  applied_to_period VARCHAR(7) NOT NULL,  -- Which period this adjustment applies to
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### GET /api/payouts
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Query Parameters:**
- `period` (optional): YYYY-MM format
- `mitra_id` (optional): Filter by mitra
- `status` (optional): draft, approved, paid

**Response:**
```json
{
  "payouts": [
    {
      "id": 1,
      "mitra_id": 5,
      "mitra_name": "Ani Yulianti",
      "period_month": "2026-01",
      "base_rate": 900000,
      "scheduled_visits": 9,
      "actual_visits": 8,
      "calculated_amount": 800000,
      "bonus": 0,
      "deductions": 0,
      "adjustment": 0,
      "final_amount": 800000,
      "status": "approved"
    }
  ]
}
```

---

### POST /api/payouts/calculate
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "mitra_id": 5,
  "period_month": "2026-01"
}
```

**Response:**
```json
{
  "mitra_id": 5,
  "period_month": "2026-01",
  "base_rate": 900000,
  "scheduled_visits": 9,
  "actual_visits": 8,
  "calculated_amount": 800000,
  "adjustments": [],
  "final_amount": 800000
}
```

---

### GET /api/payouts/[id]
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER, STAFF - own payout only)

**Response:**
```json
{
  "payout": {
    "id": 1,
    "mitra": {
      "id": 5,
      "name": "Ani Yulianti",
      "email": "ani@example.com"
    },
    "period_month": "2026-01",
    "breakdown": {
      "base_rate": 900000,
      "scheduled_visits": 9,
      "actual_visits": 8,
      "calculated_amount": 800000,
      "bonus": 0,
      "deductions": 0,
      "adjustment": 0
    },
    "final_amount": 800000,
    "adjustments": [],
    "status": "approved",
    "visits": [
      {
        "date": "2026-01-08",
        "attended": true,
        "customer_name": "Customer A"
      }
    ]
  }
}
```

---

### POST /api/payouts/[id]/approve
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Response:**
```json
{
  "success": true,
  "payout_id": 1,
  "status": "approved"
}
```

---

### POST /api/payouts/[id]/mark-paid
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "paid_at": "2026-02-05T10:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "payout_id": 1,
  "status": "paid",
  "paid_at": "2026-02-05T10:00:00Z"
}
```

---

### POST /api/payouts/export
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "period_month": "2026-01",
  "format": "csv"  // or "excel"
}
```

**Response:** File download (CSV or Excel)

**File Columns:**
- Mitra Name
- Period
- Base Rate
- Scheduled Visits
- Actual Visits
- Calculated Amount
- Adjustments
- Final Amount
- Status

---

## Code Examples

### Calculate Payout (Core Logic)
```typescript
// src/lib/payout-calculator.ts

export function calculatePayout(params: {
  baseRateMonthly: number;
  scheduledVisits: number;
  actualVisits: number;
}) {
  const { baseRateMonthly, scheduledVisits, actualVisits } = params;
  
  // Pro-rate calculation
  const calculatedAmount = 
    (actualVisits / scheduledVisits) * baseRateMonthly;
  
  return {
    calculatedAmount: Math.round(calculatedAmount),
    proration: actualVisits / scheduledVisits
  };
}
```

---

### Generate Payout with Adjustments
```typescript
// src/lib/payout-generator.ts

export async function generatePayoutForPeriod(
  mitraId: number,
  periodMonth: string
) {
  // 1. Get mitra base rate
  const mitra = await db.query.mitras.findFirst({
    where: eq(mitras.id, mitraId)
  });
  
  // 2. Get scheduled visits in period
  const scheduled = await getScheduledVisitsInPeriod(mitraId, periodMonth);
  
  // 3. Get actual attendance
  const actual = await getActualAttendanceInPeriod(mitraId, periodMonth);
  
  // 4. Calculate base payout
  const { calculatedAmount } = calculatePayout({
    baseRateMonthly: mitra.base_rate_monthly,
    scheduledVisits: scheduled.length,
    actualVisits: actual.length
  });
  
  // 5. Get any adjustments from previous periods
  const adjustments = await getPendingAdjustments(mitraId, periodMonth);
  const adjustmentTotal = adjustments.reduce((sum, adj) => sum + adj.amount, 0);
  
  // 6. Calculate final amount
  const finalAmount = calculatedAmount + adjustmentTotal;
  
  return {
    mitra_id: mitraId,
    period_month: periodMonth,
    base_rate: mitra.base_rate_monthly,
    scheduled_visits: scheduled.length,
    actual_visits: actual.length,
    calculated_amount: calculatedAmount,
    adjustment: adjustmentTotal,
    final_amount: finalAmount
  };
}
```

---

## UI Screens

### 1. Payout List Page
**Location:** `/app/payouts`  
**File:** `src/app/app/payouts/page.tsx`

**Features:**
- Filter by month, mitra, status
- Export to CSV/Excel
- Approve/Mark Paid actions
- View payout slip

---

### 2. Payout Slip Page
**Location:** `/app/payouts/[id]`  
**File:** `src/app/app/payouts/[id]/slip.tsx`

**Displays:**
- Mitra information
- Period details
- Breakdown:
  - Base Rate
  - Scheduled vs Actual visits
  - Calculated Amount
  - LAINNYA (was BONUS)
  - Adjustments (if any)
  - Final Amount
- Visit list with attendance status
- Adjustment explanations

---

### 3. Payout Rate Configuration (ADMIN)
**Location:** `/app/settings/payout-rates`  
**File:** `src/app/app/settings/payout-rates/page.tsx`

**Features:**
- View current rates per package
- Edit base rates
- Set effective dates
- Historical rate tracking

---

## Testing

### Test Scenarios

See: `TEST_SCENARIO_1a_1b_1c.csv` in root

**Scenario 1: Standard Month**
- Period: Full month (Jan 1-31)
- Schedule: 2x/week (8 visits)
- Attendance: 100% (8/8)
- Expected: Full base rate

**Scenario 2: Partial Month**
- Period: Mid-month start (Jan 15-Feb 14)
- Schedule: 2x/week (4 Jan visits, 4 Feb visits)
- Attendance: 100%
- Expected: Split across two months (4/8 each)

**Scenario 3: With Adjustment**
- Period: Feb
- Previous overpayment: -Rp 100,000
- Current calculated: Rp 200,000
- Expected: Rp 100,000 (after adjustment)

---

## Related Documents

- **Client Feedback:** `docs/client/feedback-tracking.md` (Items 1a, 1b, 1c, 8a, 8b, 9)
- **Architecture:** `docs/adrs/2025-01-22-payout-prorate-logic.md`
- **Database:** `docs/technical/database-schema.md#payouts`
- **Attendance:** `docs/features/attendance.md` (attendance data source)
- **Visit Tracking:** `docs/features/visit-tracking.md` (adjustments trigger)

---

## Known Issues

### Current Limitations
- No PDF export yet (planned Sprint 5)
- No bulk payout processing (manual per mitra)
- No automated payment gateway integration

### Workarounds
- CSV export for bulk review
- Manual marking as paid
- Bank transfer done outside system

---

## Future Enhancements

**Sprint 6+:**
1. PDF slip generation
2. Bulk payout approval
3. Email notifications to mitras
4. Payment gateway integration (e.g., bank transfer API)
5. Advanced analytics (cost trends, forecasting)

---

**Document maintained by:** Handi  
**Questions:** handi.sulyansah@gmail.com