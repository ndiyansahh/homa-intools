# Payout System - Complete Documentation

**Status:** ✅ Fully Implemented & Verified
**Last Updated:** 2026-03-07
**Owner:** Handi
**Verified By:** AI Assistant (Claude Code)

---

## Overview

Automated mitra (staff) payout calculation system with pro-rate logic, configurable rates, and adjustment mechanism.

---

## Current Implementation Status

### ✅ Implemented Features

#### 1. Pro-Rate Calculation (Feedback 8a)
**Completed:** Sprint 3
**Status:** ✅ Verified Mar 7, 2026
**Files:**
- `src/app/api/payout/route.ts` (POST handler, lines 161-576)
- `src/app/api/payout/route.ts` (getBillingCycle function, lines 21-51)

**Formula:**
```javascript
monthly_payout = (completed_visits / scheduled_visits_in_billing_cycle) × monthly_rate
```

**Key Implementation Details:**
- **Dynamic Billing Cycle:** Each visit's billing cycle is determined by its scheduled date, not payout month (line 300)
- **Pro-rate Denominator:** Uses total scheduled visits in the invoice period (billing cycle), not calendar month (line 380-390)
- **Cross-Month Support:** Single invoice period spanning 2 months is correctly split (line 292-312)
- **No Mitra Filter on Denominator:** Scheduled visits count includes all mitras to handle mid-month mitra changes (line 376-390)

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
**Status:** ✅ Verified Mar 7, 2026
**Files:**
- `src/lib/payout-adjustment.ts` (adjustment detection, lines 21-296)
- `src/app/api/payout/route.ts` (adjustment application, lines 433-543)
- `src/app/api/trial/[id]/visits/[visitId]/change-mitra/route.ts` (trigger on mitra change, lines 214-234)
- Database: `payout_adjustment_db` table

**How It Works:**
When historical visits are edited (even after period ends), adjustments are automatically calculated and applied to the next payout period.

**Supported Edit Types:**
- Status change (Done ↔ Cancelled/Scheduled)
- Mitra reassignment (actualMitraId change)
- Works for completed visits (no lock by default)

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

#### 6. PDF Payout Slip Export (Feedback 10)
**Completed:** Sprint 5
**Status:** ✅ Implemented
**Files:**
- `src/app/api/payouts/[id]/pdf/route.ts`

**Features:**
- Generate PDF payout slip with customer breakdown
- Includes visit details, adjustments, and final totals
- Download via API endpoint

---

#### 7. Historical Visit Editing (Feedback 6b)
**Completed:** Sprint 4
**Status:** ✅ Verified Mar 7, 2026
**Files:**
- `src/lib/config.ts` (CONFIG_KEYS.LOCK_COMPLETED_VISITS, line 156)
- `src/app/api/trial/[id]/visits/[visitId]/change-mitra/route.ts` (lines 75-88)
- `src/app/api/trial/[id]/visits/route.ts` (lines 445-458)

**Default Behavior:**
- Completed visits are **NOT locked** by default (`LOCK_COMPLETED_VISITS = false`)
- Users can edit historical visits even after period ends
- Admin can optionally enable lock via system config

**Supported Historical Edits:**
- ✅ Change mitra (actualMitraId)
- ✅ Change status (Done ↔ Cancelled)
- ✅ Edit scheduled date
- ✅ Works beyond payout period end

**Auto Adjustment on Edit:**
When historical visit is edited after payout generated:
1. System detects the change (status or mitra)
2. Creates adjustment record with reason
3. Applies adjustment to next payout period
4. Maintains full audit trail

**Example Flow:**
```
Jan 31 Payout: Generated with 8 visits = Rp 800,000 (PAID)
Feb 5: Discovered Jan 31 visit didn't happen
       → User changes status: Done → Cancelled
       → System creates adjustment: -Rp 100,000
Feb 28 Payout: Base Rp 200,000 + Adjustment -Rp 100,000 = Rp 100,000
```

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

### 1. Billing Cycle Calculation
```typescript
// src/app/api/payout/route.ts (lines 21-51)

function getBillingCycle(subscriptionStart: string, targetDate: Date): { start: Date; end: Date } {
  const subStart = new Date(subscriptionStart);
  const target = new Date(targetDate);

  let cycleStart = new Date(subStart);

  while (true) {
    const cycleEnd = new Date(cycleStart);
    cycleEnd.setMonth(cycleEnd.getMonth() + 1);
    cycleEnd.setDate(cycleEnd.getDate() - 1);

    if (target >= cycleStart && target <= cycleEnd) {
      return { start: cycleStart, end: cycleEnd };
    }

    cycleStart = new Date(cycleEnd);
    cycleStart.setDate(cycleStart.getDate() + 1);
  }
}
```

### 2. Pro-Rate Calculation (Per Customer per Billing Cycle)
```typescript
// src/app/api/payout/route.ts (lines 380-401)

// Count scheduled visits in THIS BILLING CYCLE
const scheduledVisitsForCustomer = await db
  .select({ id: visitDB.id })
  .from(visitDB)
  .where(
    and(
      eq(visitDB.customerId, customerId),
      // NO mitraId filter - total scheduled for customer
      gte(visitDB.scheduledDate, billingCycle.start.toISOString().split('T')[0]),
      lte(visitDB.scheduledDate, billingCycle.end.toISOString().split('T')[0])
    )
  );

const scheduled = scheduledVisitsForCustomer.length;
const completed = cycleVisits.length;

// Pro-rate calculation
const denominator = scheduled > 0 ? scheduled : completed;
const customerPayout = (completed / denominator) * monthlyRate;
```

### 3. Adjustment Detection on Historical Edit
```typescript
// src/lib/payout-adjustment.ts (lines 237-250)

if (wasCompleted && !isCompleted) {
  // Changed from Done to Cancelled/Scheduled
  const perVisitAmount = Number(customerPayout.monthlyRate) / Number(customerPayout.scheduledVisits);
  adjustmentAmount = -perVisitAmount; // Deduct
  adjustmentType = 'OVERPAYMENT_DEDUCTION';
  reason = `Visit #${visitId.slice(0, 8)} for ${customerName} status changed from Done to ${newStatus}. Overpayment deduction.`;
} else if (!wasCompleted && isCompleted) {
  // Changed from Cancelled/Scheduled to Done
  const perVisitAmount = Number(customerPayout.monthlyRate) / Number(customerPayout.scheduledVisits);
  adjustmentAmount = perVisitAmount; // Add
  adjustmentType = 'UNDERPAYMENT_ADDITION';
  reason = `Visit #${visitId.slice(0, 8)} for ${customerName} status changed from ${oldStatus} to Done. Underpayment correction.`;
}
```

### 4. Apply Adjustments to Payout
```typescript
// src/app/api/payout/route.ts (lines 433-472)

// Get pending adjustments
const pendingAdjustments = await db
  .select()
  .from(payoutAdjustmentDB)
  .where(
    and(
      eq(payoutAdjustmentDB.mitraId, mitra.id),
      eq(payoutAdjustmentDB.status, 'PENDING')
    )
  );

let totalAdjustmentAmount = 0;
for (const adj of pendingAdjustments) {
  totalAdjustmentAmount += Number(adj.adjustmentAmount);
}

// Calculate final payout with adjustments
const finalBasePayout = totalBasePayout + totalAdjustmentAmount;
const finalTotalPayout = finalBasePayout + bonusAmount;
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