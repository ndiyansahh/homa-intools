# Visit Tracking & Scheduling System

**Status:** ✅ Implemented (Sprint 2)  
**Last Updated:** 2025-01-29  
**Owner:** Handi

---

## Overview

Scheduled visit management system for tracking cleaning visits with flexible scheduling and historical editing capabilities.

---

## Current Implementation Status

### ✅ Implemented Features (Sprint 2-4)

#### 1. Visit Scheduling
**Files:**
- `src/app/app/customers/[id]/visits/page.tsx`
- `src/app/api/visits/schedule/route.ts`
- `src/components/visit-scheduler.tsx`

**Features:**
- Create scheduled visits
- Recurring schedule support
- One-time visit booking
- Mitra assignment
- Time slot selection

---

#### 2. Visit Status Tracking
**Files:**
- `src/lib/visit-status-tracker.ts`
- `src/app/api/visits/[id]/status/route.ts`

**Statuses:**
- **scheduled** - Visit planned, not yet occurred
- **completed** - Visit completed, mitra attended
- **missed** - Visit scheduled but mitra didn't attend
- **cancelled** - Visit cancelled by customer/admin
- **rescheduled** - Visit moved to different date/time

---

#### 3. Historical Visit Editing (Feedback 6b)
**Completed:** Sprint 4  
**Files:**
- `src/app/api/visits/[id]/edit/route.ts`
- `src/components/visit-editor.tsx`

**Features:**
- Edit visits from any period (no lock)
- Change date, time, status
- Add/edit notes
- Triggers payout adjustment if needed
- Audit trail maintained

---

### ⏳ Planned Features

#### Feedback 6a: Bulk Attendance Marking
**Status:** ⏳ Planned (Sprint 5)  
**Target:** Feb 13, 2026

**Current (Being Removed):**
- Individual "Mark Attended" button per visit

**Planned:**
- Checkbox selection
- Bulk "Mark Attended" button
- Faster workflow

---

### ⏳ Planned Features (Sprint 6)

#### Feedback 5a: Same-Day Multiple Visits
**Target:** Sprint 6

**Current Limitation:**
- Can't schedule multiple visits on same day

**Example Use Case:**
```
Customer wants Regular (2x/week):
- Monday 08:00-11:00
- Monday 11:00-14:00
```

**Solution:** Remove unique day constraint

---

## Database Schema

### Tables

**scheduled_visits**
```sql
CREATE TABLE scheduled_visits (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  mitra_id INTEGER REFERENCES mitras(id),
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_day VARCHAR(20),  -- 'monday', 'tuesday', etc.
  duration_minutes INTEGER DEFAULT 180,  -- 3 hours default
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled',  
  -- 'scheduled', 'completed', 'missed', 'cancelled', 'rescheduled'
  
  -- Completion tracking
  completed_at TIMESTAMP,
  completed_by INTEGER REFERENCES users(id),
  
  -- Linked attendance
  attendance_record_id INTEGER REFERENCES attendance_records(id),
  
  -- Cancellation/Rescheduling
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  rescheduled_to INTEGER REFERENCES scheduled_visits(id),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);

-- Indexes
CREATE INDEX idx_visits_customer ON scheduled_visits(customer_id);
CREATE INDEX idx_visits_mitra ON scheduled_visits(mitra_id);
CREATE INDEX idx_visits_date ON scheduled_visits(scheduled_date);
CREATE INDEX idx_visits_status ON scheduled_visits(status);

-- CURRENT CONSTRAINT (To be removed in Sprint 6)
-- UNIQUE(customer_id, scheduled_date, scheduled_day)
```

**visit_edit_history**
```sql
CREATE TABLE visit_edit_history (
  id SERIAL PRIMARY KEY,
  visit_id INTEGER REFERENCES scheduled_visits(id) NOT NULL,
  edited_by INTEGER REFERENCES users(id),
  
  -- Changes
  field_changed VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  
  -- Reason
  reason TEXT,
  
  -- Impact
  payout_adjustment_triggered BOOLEAN DEFAULT FALSE,
  adjustment_amount DECIMAL(10,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

**recurring_schedule_templates**
```sql
CREATE TABLE recurring_schedule_templates (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  
  -- Pattern
  days_of_week VARCHAR(50)[],  -- ['monday', 'thursday']
  time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 180,
  
  -- Assigned mitra
  mitra_id INTEGER REFERENCES mitras(id),
  
  -- Active period
  start_date DATE NOT NULL,
  end_date DATE,  -- NULL = ongoing
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### POST /api/visits/schedule
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request (Single Visit):**
```json
{
  "customer_id": 123,
  "mitra_id": 5,
  "scheduled_date": "2026-02-05",
  "scheduled_time": "09:00",
  "duration_minutes": 180,
  "notes": "First visit"
}
```

**Request (Recurring Schedule):**
```json
{
  "customer_id": 123,
  "mitra_id": 5,
  "recurring": true,
  "schedule": {
    "days": ["monday", "thursday"],
    "time": "09:00",
    "duration_minutes": 180
  },
  "start_date": "2026-02-05",
  "end_date": null  // ongoing
}
```

**Response:**
```json
{
  "success": true,
  "visits_created": 8,  // For recurring
  "visit_ids": [456, 457, 458, ...],
  "message": "Visits scheduled successfully"
}
```

---

### GET /api/visits
**Status:** ✅ Implemented  
**Auth:** Required (ALL roles)

**Query Parameters:**
- `customer_id` (optional): Filter by customer
- `mitra_id` (optional): Filter by mitra
- `start_date` (optional): YYYY-MM-DD
- `end_date` (optional): YYYY-MM-DD
- `status` (optional): scheduled, completed, missed, cancelled

**Response:**
```json
{
  "visits": [
    {
      "id": 456,
      "customer": {
        "id": 123,
        "name": "John Doe",
        "address": "Jakarta Selatan"
      },
      "mitra": {
        "id": 5,
        "name": "Ani Yulianti"
      },
      "scheduled_date": "2026-02-05",
      "scheduled_time": "09:00",
      "duration_minutes": 180,
      "status": "scheduled",
      "notes": "First visit",
      "created_at": "2026-01-29T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "per_page": 20
  }
}
```

---

### GET /api/visits/[id]
**Status:** ✅ Implemented  
**Auth:** Required (ALL roles)

**Response:**
```json
{
  "visit": {
    "id": 456,
    "customer": {
      "id": 123,
      "name": "John Doe",
      "phone": "08123456789",
      "address": "Jakarta Selatan"
    },
    "mitra": {
      "id": 5,
      "name": "Ani Yulianti",
      "phone": "08155555555"
    },
    "scheduled_date": "2026-02-05",
    "scheduled_time": "09:00",
    "scheduled_day": "monday",
    "duration_minutes": 180,
    "status": "completed",
    "completed_at": "2026-02-05T12:00:00Z",
    "attendance_record": {
      "clock_in_time": "2026-02-05T09:05:00+07:00",
      "clock_out_time": "2026-02-05T12:00:00+07:00",
      "duration_hours": 2.92
    },
    "notes": "All tasks completed",
    "edit_history": [
      {
        "edited_at": "2026-02-06T10:00:00Z",
        "edited_by": "Admin",
        "field_changed": "status",
        "old_value": "scheduled",
        "new_value": "completed",
        "reason": "Manual completion"
      }
    ]
  }
}
```

---

### PUT /api/visits/[id]/edit
**Status:** ✅ Implemented (Sprint 4)  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "scheduled_date": "2026-02-06",  // optional
  "scheduled_time": "10:00",       // optional
  "status": "missed",              // optional
  "mitra_id": 6,                   // optional
  "notes": "Updated notes",        // optional
  "reason": "Customer rescheduled" // required for audit
}
```

**Response:**
```json
{
  "success": true,
  "visit_id": 456,
  "updated_fields": ["scheduled_date", "status"],
  "payout_adjustment_triggered": true,
  "adjustment": {
    "mitra_id": 5,
    "period": "2026-02",
    "amount": -100000,
    "reason": "Visit 456 marked as missed after payout calculated"
  }
}
```

**Important (Feedback 6b):**
- No period lock - can edit any historical visit
- If payout already calculated → adjustment created
- All edits logged in `visit_edit_history`

---

### POST /api/visits/[id]/mark-attended
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "attended": true,  // or false
  "notes": "Completed all tasks"
}
```

**Response:**
```json
{
  "success": true,
  "visit_id": 456,
  "status": "completed",
  "attendance_record_created": true
}
```

**Note:** This endpoint will be updated in Sprint 5 (Feedback 6a) to support bulk operations

---

### POST /api/visits/[id]/cancel
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "reason": "Customer traveling"
}
```

**Response:**
```json
{
  "success": true,
  "visit_id": 456,
  "status": "cancelled",
  "cancelled_at": "2026-01-29T15:00:00Z"
}
```

---

### POST /api/visits/[id]/reschedule
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "new_date": "2026-02-10",
  "new_time": "14:00",
  "reason": "Customer request"
}
```

**Response:**
```json
{
  "success": true,
  "old_visit_id": 456,
  "new_visit_id": 789,
  "new_scheduled_date": "2026-02-10",
  "new_scheduled_time": "14:00"
}
```

---

### POST /api/visits/bulk/mark-attended
**Status:** ⏳ Planned (Sprint 5)  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "visit_ids": [456, 457, 458],
  "attended": true,
  "notes": "Bulk completion"
}
```

**Response:**
```json
{
  "success": true,
  "updated_count": 3,
  "visit_ids": [456, 457, 458],
  "attendance_records_created": 3
}
```

---

## Code Examples

### Generate Recurring Schedule
```typescript
// src/lib/recurring-schedule-generator.ts

export function generateRecurringSchedule(params: {
  customer_id: number;
  mitra_id: number;
  start_date: string;  // YYYY-MM-DD
  end_date?: string;   // YYYY-MM-DD or null for ongoing
  days: string[];      // ['monday', 'thursday']
  time: string;        // HH:MM
  duration_minutes: number;
}) {
  const { 
    customer_id, mitra_id, start_date, end_date, 
    days, time, duration_minutes 
  } = params;
  
  const visits: any[] = [];
  const start = new Date(start_date);
  const end = end_date ? new Date(end_date) : addMonths(start, 3); // Default 3 months
  
  let currentDate = start;
  
  while (currentDate <= end) {
    const dayName = getDayName(currentDate); // 'monday', 'tuesday', etc.
    
    if (days.includes(dayName)) {
      visits.push({
        customer_id,
        mitra_id,
        scheduled_date: formatDate(currentDate),
        scheduled_time: time,
        scheduled_day: dayName,
        duration_minutes,
        status: 'scheduled'
      });
    }
    
    currentDate = addDays(currentDate, 1);
  }
  
  return visits;
}

// Usage
const visits = generateRecurringSchedule({
  customer_id: 123,
  mitra_id: 5,
  start_date: '2026-02-01',
  end_date: null,  // ongoing
  days: ['monday', 'thursday'],
  time: '09:00',
  duration_minutes: 180
});

await db.insert(scheduledVisits).values(visits);
```

---

### Edit Visit with Payout Adjustment Check
```typescript
// src/app/api/visits/[id]/edit/route.ts

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const visitId = parseInt(params.id);
  const updates = await req.json();
  
  // Get original visit
  const originalVisit = await db.query.scheduledVisits.findFirst({
    where: eq(scheduledVisits.id, visitId),
    with: { mitra: true }
  });
  
  if (!originalVisit) {
    return Response.json({ error: 'Visit not found' }, { status: 404 });
  }
  
  // Check if payout already calculated for this period
  const visitMonth = formatMonth(originalVisit.scheduled_date); // YYYY-MM
  const existingPayout = await db.query.payouts.findFirst({
    where: and(
      eq(payouts.mitra_id, originalVisit.mitra_id),
      eq(payouts.period_month, visitMonth),
      ne(payouts.status, 'draft')
    )
  });
  
  let adjustmentTriggered = false;
  let adjustmentAmount = 0;
  
  // If status changed from completed → missed/cancelled
  if (existingPayout && updates.status && updates.status !== 'completed') {
    if (originalVisit.status === 'completed') {
      // Calculate adjustment (negative = deduction)
      const mitraRate = originalVisit.mitra.base_rate_monthly;
      const scheduledVisitsInPeriod = await getScheduledVisitsCount(
        originalVisit.mitra_id, 
        visitMonth
      );
      
      adjustmentAmount = -(mitraRate / scheduledVisitsInPeriod);
      adjustmentTriggered = true;
      
      // Create adjustment record
      await db.insert(payoutAdjustments).values({
        payout_id: existingPayout.id,
        reason: `Visit ${visitId} marked as ${updates.status} after payout calculated`,
        amount: adjustmentAmount,
        related_visit_id: visitId,
        applied_to_period: getNextMonth(visitMonth)
      });
    }
  }
  
  // Update visit
  await db.update(scheduledVisits)
    .set({
      ...updates,
      updated_at: new Date()
    })
    .where(eq(scheduledVisits.id, visitId));
  
  // Log edit
  await logVisitEdit({
    visit_id: visitId,
    edited_by: req.userId,
    changes: updates,
    reason: updates.reason
  });
  
  return Response.json({
    success: true,
    visit_id: visitId,
    updated_fields: Object.keys(updates),
    payout_adjustment_triggered: adjustmentTriggered,
    adjustment: adjustmentTriggered ? {
      amount: adjustmentAmount,
      period: getNextMonth(visitMonth)
    } : null
  });
}
```

---

## UI Screens

### 1. Customer Visit Schedule Page
**Location:** `/app/customers/[id]/visits`  
**File:** `src/app/app/customers/[id]/visits/page.tsx`

**Features:**
- Calendar view of scheduled visits
- List view with filters
- Status indicators (color-coded)
- Quick actions per visit:
  - Mark Attended (to be replaced with bulk in Sprint 5)
  - Edit
  - Cancel
  - Reschedule

**Current View:**
```
┌────────────────────────────────────────┐
│ Scheduled Visits - John Doe            │
├────────────────────────────────────────┤
│ Feb 2026                               │
│ ┌────┬────┬────┬────┬────┬────┬────┐ │
│ │ Su │ Mo │ Tu │ We │ Th │ Fr │ Sa │ │
│ ├────┼────┼────┼────┼────┼────┼────┤ │
│ │    │ 3● │ 4  │ 5  │ 6● │ 7  │ 8  │ │ ● = scheduled
│ │ 9  │10● │11  │12  │13● │14  │15  │ │
│ └────┴────┴────┴────┴────┴────┴────┘ │
│                                        │
│ Upcoming Visits:                       │
│ ┌──────────────────────────────────┐  │
│ │ 📅 Feb 3, 09:00 - Customer A     │  │
│ │ Mitra: Ani Yulianti              │  │
│ │ [Mark Attended] [Edit] [Cancel]  │  │ ← To be changed (Sprint 5)
│ └──────────────────────────────────┘  │
│ ┌──────────────────────────────────┐  │
│ │ 📅 Feb 6, 09:00 - Customer A     │  │
│ │ Mitra: Ani Yulianti              │  │
│ │ [Mark Attended] [Edit] [Cancel]  │  │
│ └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**Sprint 5 Target:**
```
Upcoming Visits:
┌──────────────────────────────────┐
│ ☐ Feb 3, 09:00 - Customer A     │
│ ☐ Feb 6, 09:00 - Customer A     │
│ ☐ Feb 10, 09:00 - Customer A    │
│ ☐ Feb 13, 09:00 - Customer A    │
└──────────────────────────────────┘
[Bulk Mark Attended] [Export]
```

---

### 2. Visit Editor Modal
**Location:** Modal on visit detail  
**File:** `src/components/visit-editor.tsx`

**Fields:**
- Date picker
- Time picker
- Mitra selection
- Status dropdown
- Notes textarea
- Reason for edit (required)

**Shows Warning:**
If payout already calculated:
```
⚠️ Warning: This visit is in a closed payout period.
Editing will create an adjustment of Rp -100,000
in the next payout for Ani Yulianti.
```

---

### 3. Recurring Schedule Setup
**Location:** Customer creation/edit  
**File:** `src/components/recurring-schedule-form.tsx`

**Current:**
```
┌─────────────────────────────────┐
│ Recurring Schedule              │
├─────────────────────────────────┤
│ Package: Regular (2x/week)      │
│                                 │
│ Select Days:                    │
│ ☐ Monday    ☐ Friday           │
│ ☑ Tuesday   ☐ Saturday         │ ← UNIQUE constraint
│ ☐ Wednesday ☐ Sunday           │
│ ☑ Thursday                      │ ← Can't select same day twice
│                                 │
│ Time: [09:00]                   │
│ Duration: [3 hours]             │
│                                 │
│ [Save Schedule]                 │
└─────────────────────────────────┘
```

**Sprint 6 Target (Feedback 5a):**
```
┌─────────────────────────────────┐
│ Recurring Schedule              │
├─────────────────────────────────┤
│ Package: Regular (2x/week)      │
│                                 │
│ Schedule 1:                     │
│ Day: [Monday ▼] Time: [08:00]   │
│                                 │
│ Schedule 2:                     │
│ Day: [Monday ▼] Time: [11:00]   │ ← Same day allowed!
│                                 │
│ [+ Add More Schedules]          │
│ [Save Schedule]                 │
└─────────────────────────────────┘
```

---

## Integration with Other Features

### 1. Attendance System
**Flow:**
```
Scheduled Visit Created
  → Shows in mitra's attendance list
  → Mitra clocks in
  → Links to attendance_record
  → Auto-marks visit as completed
```

**Code Reference:**
- See: `docs/features/attendance.md#visit-association`

---

### 2. Payout Calculation
**Flow:**
```
Scheduled Visits (month)
  → Count completed visits
  → Feed into payout calculator
  → Generate payout amount

Historical Edit
  → Check if payout calculated
  → Create adjustment if needed
  → Apply to next period
```

**Code Reference:**
- See: `docs/features/payout-system.md#adjustment-mechanism`

---

### 3. Customer Lifecycle
**Flow:**
```
Customer Conversion (trial → subscription)
  → Generate recurring schedule
  → Create scheduled visits
  → Assign mitra

Subscription Pause
  → Cancel future scheduled visits
  → Preserve historical visits

Subscription Resume
  → Recreate scheduled visits
```

**Code Reference:**
- See: `docs/features/customer-management.md#subscription-management`

---

## Client Feedback Implementation

### ✅ Feedback 6b: Historical Editing
**Status:** ✅ Implemented (Sprint 4)  
**Files:**
- `src/app/api/visits/[id]/edit/route.ts`
- `src/components/visit-editor.tsx`

**Implementation:**
- Removed period lock
- All visits editable anytime
- Payout adjustments auto-created
- Full audit trail

**Client Quote:**
> "kadang ada case dimana baru ada info beyond end of the period, jadi need to look back & do editing"

**Solution:** ✅ Fully implemented

---

### ⏳ Feedback 6a: Remove Attended Button
**Status:** ⏳ Planned (Sprint 5)  
**Target:** Feb 13, 2026

**Current Issue:** "too hassle for user"  
**Solution:** Checkbox + bulk action

---

### ⏳ Feedback 5a: Same-Day Scheduling
**Status:** ⏳ Planned (Sprint 6)  
**Target:** Feb 24, 2026

**Use Case:**
```
Customer wants:
- Monday 08:00-11:00
- Monday 11:00-14:00
```

**Solution:** Remove unique day constraint in DB + UI

---

## Testing

### Test Scenarios

**Scenario 1: Create Recurring Schedule**
1. Create customer with Regular package
2. Select Monday & Thursday at 09:00
3. Generate for 3 months
4. Verify: ~24 visits created (2/week × ~12 weeks)

**Scenario 2: Edit Historical Visit**
1. Mark visit as completed
2. Calculate payout
3. Edit visit status to "missed"
4. Verify: Adjustment created
5. Verify: Next payout includes adjustment

**Scenario 3: Reschedule Visit**
1. Open scheduled visit
2. Reschedule to new date
3. Verify: Original visit status = rescheduled
4. Verify: New visit created
5. Verify: Link maintained

**Scenario 4: Bulk Mark Attended (Sprint 5)**
1. Select 5 visits
2. Click "Bulk Mark Attended"
3. Verify: All 5 marked as completed
4. Verify: 5 attendance records created

---

## Known Issues & Limitations

### Current
- Can't schedule same day multiple times (Sprint 6 fix)
- Individual buttons hassle (Sprint 5 fix)
- No visit reminders/notifications
- No customer confirmation system

### Planned Improvements
- SMS/email reminders
- Customer portal for visit confirmation
- Route optimization for mitras
- Visit feedback collection

---

## Related Documents

- **Attendance:** `docs/features/attendance.md` (attendance tracking)
- **Payout System:** `docs/features/payout-system.md` (visit → payout)
- **Customer Management:** `docs/features/customer-management.md` (scheduling setup)
- **Client Feedback:** `docs/client/feedback-tracking.md` (Items 5a, 6a, 6b)
- **Database Schema:** `docs/technical/database-schema.md#visits`

---

**Document maintained by:** Handi  
**Last Major Update:** Sprint 4 (Feb 3, 2026)  
**Next Update:** Sprint 5 (Bulk actions) + Sprint 6 (Same-day scheduling)