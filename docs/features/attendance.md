# Attendance Tracking System

**Status:** ✅ Implemented (Sprint 3)  
**Last Updated:** 2025-01-29  
**Owner:** Handi

---

## Overview

Mitra (staff) attendance tracking system with clock-in/out functionality, monthly reports, and integration with payout calculation.

---

## Current Implementation Status

### ✅ Implemented Features (Sprint 3)

#### 1. Clock In/Out System
**Files:**
- `src/app/app/attendance/page.tsx` - Main attendance page
- `src/app/api/attendance/clock-in/route.ts` - Clock in endpoint
- `src/app/api/attendance/clock-out/route.ts` - Clock out endpoint
- `src/components/attendance-card.tsx` - Attendance UI component

**Features:**
- Timestamp with Asia/Jakarta timezone
- GPS location capture (optional)
- Photo upload for verification (optional)
- Automatic visit association

---

#### 2. Attendance History
**Files:**
- `src/app/app/attendance/history/page.tsx` - History view
- `src/app/api/attendance/history/route.ts` - History API

**Features:**
- Filter by date range
- Filter by mitra
- Filter by customer/location
- Export to CSV
- Monthly summary reports

---

#### 3. Monthly Reports
**Files:**
- `src/app/app/attendance/reports/page.tsx` - Reports page
- `src/app/api/attendance/reports/route.ts` - Reports API

**Features:**
- Attendance rate per mitra
- Total hours worked
- Late/absent tracking
- Integration with payout calculation

---

### 🔄 Recently Updated (Sprint 4)

#### Feedback 6b: Historical Editing Always Enabled
**Files Modified:**
- `src/app/api/attendance/[id]/edit/route.ts` - Removed period lock
- `src/components/attendance-editor.tsx` - Edit always enabled

**Change:**
- Previously: Couldn't edit attendance after period closed
- Now: Can edit historical attendance anytime
- Triggers: Payout adjustment if period already calculated

---

### ⏳ Planned Improvements (Sprint 5-6)

#### Feedback 6a: Remove Per-Line "Attended" Button
**Status:** ⏳ Planned (Sprint 5)  
**Target:** Feb 13, 2026

**Current Behavior:**
```
┌────────────────────────────────────────┐
│ Scheduled Visits                       │
├────────────────────────────────────────┤
│ 2026-01-29 09:00 - Customer A         │
│ [Mark Attended] [Skip]          ← Remove
├────────────────────────────────────────┤
│ 2026-01-30 09:00 - Customer B         │
│ [Mark Attended] [Skip]          ← Remove
└────────────────────────────────────────┘
```

**Target Behavior:**
```
┌────────────────────────────────────────┐
│ Scheduled Visits                       │
├────────────────────────────────────────┤
│ ☐ 2026-01-29 09:00 - Customer A       │
│ ☐ 2026-01-30 09:00 - Customer B       │
│ ☐ 2026-01-31 09:00 - Customer C       │
│                                        │
│ [Bulk Mark Attended]            ← New  │
└────────────────────────────────────────┘
```

**Reason:** Too hassle clicking individually (client feedback)

---

## Database Schema

### Tables

**attendance_records**
```sql
CREATE TABLE attendance_records (
  id SERIAL PRIMARY KEY,
  mitra_id INTEGER REFERENCES mitras(id) NOT NULL,
  scheduled_visit_id INTEGER REFERENCES scheduled_visits(id),
  customer_id INTEGER REFERENCES customers(id),
  
  -- Clock In/Out
  clock_in_time TIMESTAMP NOT NULL,
  clock_out_time TIMESTAMP,
  
  -- Location (optional)
  clock_in_lat DECIMAL(10, 8),
  clock_in_lng DECIMAL(11, 8),
  clock_out_lat DECIMAL(10, 8),
  clock_out_lng DECIMAL(11, 8),
  
  -- Photos (optional)
  clock_in_photo_url TEXT,
  clock_out_photo_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'clocked_in',  -- 'clocked_in', 'clocked_out', 'absent'
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Index for performance
CREATE INDEX idx_attendance_mitra_date ON attendance_records(mitra_id, clock_in_time);
CREATE INDEX idx_attendance_visit ON attendance_records(scheduled_visit_id);
```

**attendance_edit_history**
```sql
CREATE TABLE attendance_edit_history (
  id SERIAL PRIMARY KEY,
  attendance_record_id INTEGER REFERENCES attendance_records(id),
  edited_by INTEGER REFERENCES users(id),
  field_changed VARCHAR(50),
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### POST /api/attendance/clock-in
**Status:** ✅ Implemented  
**Auth:** Required (STAFF, ADMIN, OWNER)

**Request:**
```json
{
  "mitra_id": 5,
  "scheduled_visit_id": 123,  // optional
  "location": {                // optional
    "lat": -6.2088,
    "lng": 106.8456
  },
  "photo": "base64_string_or_url"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "attendance_id": 456,
  "clock_in_time": "2026-01-29T09:05:23+07:00",
  "message": "Clock in successful"
}
```

**Validation:**
- Timezone: Must use Asia/Jakarta
- Duplicate check: Can't clock in twice without clock out
- Visit association: Validates scheduled_visit_id if provided

---

### POST /api/attendance/clock-out
**Status:** ✅ Implemented  
**Auth:** Required (STAFF, ADMIN, OWNER)

**Request:**
```json
{
  "attendance_id": 456,
  "location": {              // optional
    "lat": -6.2088,
    "lng": 106.8456
  },
  "photo": "base64_string_or_url",  // optional
  "notes": "Completed all tasks"    // optional
}
```

**Response:**
```json
{
  "success": true,
  "attendance_id": 456,
  "clock_out_time": "2026-01-29T12:30:45+07:00",
  "duration_hours": 3.42,
  "message": "Clock out successful"
}
```

---

### GET /api/attendance/history
**Status:** ✅ Implemented  
**Auth:** Required (STAFF - own only, ADMIN/OWNER - all)

**Query Parameters:**
- `mitra_id` (optional): Filter by mitra
- `start_date` (optional): YYYY-MM-DD format
- `end_date` (optional): YYYY-MM-DD format
- `customer_id` (optional): Filter by customer
- `status` (optional): clocked_in, clocked_out, absent

**Response:**
```json
{
  "attendance_records": [
    {
      "id": 456,
      "mitra": {
        "id": 5,
        "name": "Ani Yulianti"
      },
      "customer": {
        "id": 10,
        "name": "Customer A"
      },
      "clock_in_time": "2026-01-29T09:05:23+07:00",
      "clock_out_time": "2026-01-29T12:30:45+07:00",
      "duration_hours": 3.42,
      "status": "clocked_out",
      "has_photos": true,
      "notes": "Completed all tasks"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 20
  }
}
```

---

### GET /api/attendance/reports/monthly
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Query Parameters:**
- `month`: YYYY-MM format (required)
- `mitra_id` (optional): Filter by mitra

**Response:**
```json
{
  "month": "2026-01",
  "mitra_reports": [
    {
      "mitra_id": 5,
      "mitra_name": "Ani Yulianti",
      "total_scheduled": 20,
      "total_attended": 18,
      "total_absent": 2,
      "attendance_rate": 90.0,
      "total_hours": 72.5,
      "late_count": 1,
      "details": [
        {
          "date": "2026-01-29",
          "scheduled_time": "09:00",
          "actual_clock_in": "09:05",
          "status": "on_time",
          "customer": "Customer A"
        }
      ]
    }
  ]
}
```

---

### PUT /api/attendance/[id]/edit
**Status:** ✅ Implemented (Sprint 4)  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "clock_in_time": "2026-01-29T09:00:00+07:00",  // optional
  "clock_out_time": "2026-01-29T12:00:00+07:00", // optional
  "status": "clocked_out",                        // optional
  "notes": "Corrected time",                      // optional
  "reason": "Time entry error"                    // required for audit
}
```

**Response:**
```json
{
  "success": true,
  "attendance_id": 456,
  "updated_fields": ["clock_in_time", "notes"],
  "adjustment_triggered": true,  // If payout period already calculated
  "adjustment_amount": -50000    // Adjustment to next payout
}
```

**Important:**
- No period lock (Feedback 6b implemented)
- Edits tracked in `attendance_edit_history`
- Triggers payout adjustment if needed

---

### POST /api/attendance/export
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-01-31",
  "mitra_id": 5,  // optional
  "format": "csv"  // or "excel"
}
```

**Response:** File download

**CSV Columns:**
- Date
- Mitra Name
- Customer Name
- Clock In Time
- Clock Out Time
- Duration (hours)
- Status
- Notes

---

## Code Examples

### Clock In Logic
```typescript
// src/app/api/attendance/clock-in/route.ts

import { db } from '@/lib/db';
import { attendanceRecords } from '@/lib/db/schema';
import { getCurrentJakartaTime } from '@/lib/date-utils';

export async function POST(req: Request) {
  const { mitra_id, scheduled_visit_id, location, photo } = await req.json();
  
  // Validate no active clock-in
  const activeClockIn = await db.query.attendanceRecords.findFirst({
    where: and(
      eq(attendanceRecords.mitra_id, mitra_id),
      eq(attendanceRecords.status, 'clocked_in')
    )
  });
  
  if (activeClockIn) {
    return Response.json(
      { error: 'Already clocked in. Please clock out first.' },
      { status: 400 }
    );
  }
  
  // Create attendance record
  const [attendance] = await db.insert(attendanceRecords).values({
    mitra_id,
    scheduled_visit_id,
    clock_in_time: getCurrentJakartaTime(),
    clock_in_lat: location?.lat,
    clock_in_lng: location?.lng,
    clock_in_photo_url: photo,
    status: 'clocked_in'
  }).returning();
  
  return Response.json({
    success: true,
    attendance_id: attendance.id,
    clock_in_time: attendance.clock_in_time
  });
}
```

---

### Monthly Report Generation
```typescript
// src/lib/attendance-report-generator.ts

export async function generateMonthlyReport(
  month: string,  // YYYY-MM
  mitraId?: number
) {
  const startDate = `${month}-01`;
  const endDate = getLastDayOfMonth(month);
  
  // Get all scheduled visits in month
  const scheduledVisits = await db.query.scheduledVisits.findMany({
    where: and(
      gte(scheduledVisits.scheduled_date, startDate),
      lte(scheduledVisits.scheduled_date, endDate),
      mitraId ? eq(scheduledVisits.mitra_id, mitraId) : undefined
    ),
    with: {
      mitra: true,
      customer: true
    }
  });
  
  // Get actual attendance
  const attendance = await db.query.attendanceRecords.findMany({
    where: and(
      gte(attendanceRecords.clock_in_time, startDate),
      lte(attendanceRecords.clock_in_time, endDate),
      mitraId ? eq(attendanceRecords.mitra_id, mitraId) : undefined
    )
  });
  
  // Group by mitra
  const mitraGroups = groupBy(scheduledVisits, 'mitra_id');
  
  const reports = Object.entries(mitraGroups).map(([mitraId, visits]) => {
    const mitraAttendance = attendance.filter(a => a.mitra_id === Number(mitraId));
    
    return {
      mitra_id: Number(mitraId),
      mitra_name: visits[0].mitra.name,
      total_scheduled: visits.length,
      total_attended: mitraAttendance.filter(a => a.status === 'clocked_out').length,
      total_absent: visits.length - mitraAttendance.length,
      attendance_rate: (mitraAttendance.length / visits.length) * 100,
      total_hours: calculateTotalHours(mitraAttendance)
    };
  });
  
  return reports;
}
```

---

## UI Screens

### 1. Attendance Page (Main)
**Location:** `/app/attendance`  
**File:** `src/app/app/attendance/page.tsx`

**For Staff:**
- Large "Clock In" / "Clock Out" button
- Current status display
- Today's scheduled visits
- Recent attendance history (own)

**For Admin/Owner:**
- All staff attendance overview
- Real-time status (who's clocked in)
- Quick filters (today, this week, this month)
- Export button

---

### 2. Attendance History
**Location:** `/app/attendance/history`  
**File:** `src/app/app/attendance/history/page.tsx`

**Features:**
- Date range picker
- Mitra filter (Admin/Owner)
- Customer filter
- Status filter
- Table view with:
  - Date & Time
  - Mitra Name
  - Customer Name
  - Duration
  - Status
  - Actions (Edit, View Details)

---

### 3. Monthly Reports
**Location:** `/app/attendance/reports`  
**File:** `src/app/app/attendance/reports/page.tsx`

**Features:**
- Month selector
- Summary cards:
  - Total Attendance Rate
  - Total Hours Worked
  - Late Count
  - Absent Count
- Per-mitra breakdown table
- Export to PDF/Excel
- Integration with payout reports

---

### 4. Attendance Editor (Admin)
**Location:** `/app/attendance/[id]/edit`  
**File:** `src/app/app/attendance/[id]/edit/page.tsx`

**Features:**
- Edit clock in/out times
- Change status (attended, absent)
- Add/edit notes
- Reason for edit (audit trail)
- Shows if payout adjustment triggered
- Edit history log

---

## Integration with Other Features

### 1. Payout Calculation
**Flow:**
```
Attendance Records 
  → Count actual visits per month
  → Feed into payout calculator
  → Generate payout amount
```

**Code Reference:**
- `src/lib/payout-calculator.ts` - Reads from attendance_records
- See: `docs/features/payout-system.md#calculation-logic`

---

### 2. Visit Scheduling
**Flow:**
```
Scheduled Visit Created
  → Shows in attendance list
  → Mitra clocks in/out
  → Visit marked as completed
  → Updates customer visit history
```

**Code Reference:**
- See: `docs/features/visit-tracking.md`

---

### 3. Historical Edits → Payout Adjustments
**Flow:**
```
Admin edits attendance (mark absent)
  → Check if payout already calculated
  → If yes: Create payout adjustment
  → If no: Update before calculation
  → Log edit in audit trail
```

**Code Reference:**
- See: `docs/features/payout-system.md#adjustment-mechanism`

---

## Client Feedback Implementation

### ✅ Feedback 6b: Historical Editing
**Status:** ✅ Implemented (Sprint 4)  
**Files:**
- `src/app/api/attendance/[id]/edit/route.ts`
- `src/components/attendance-editor.tsx`

**Change:**
- Removed period lock validation
- All historical records editable
- Audit trail maintained
- Payout adjustments triggered automatically

**Client Quote (Jan 3 meeting):**
> "kadang ada case dimana baru ada info beyond end of the period, jadi need to look back & do editing"

**Solution:** ✅ Implemented

---

### ⏳ Feedback 6a: Remove Per-Line Button
**Status:** ⏳ Planned (Sprint 5)  
**Target:** Feb 13, 2026

**Current Issue:**
- Individual "Attended" button on each visit
- Too many clicks for bulk marking

**Planned Solution:**
- Checkbox selection
- Bulk "Mark Attended" button
- Faster workflow

---

## Testing

### Test Scenarios

**Scenario 1: Normal Clock In/Out**
1. Staff clocks in at 09:00
2. Works for 3 hours
3. Clocks out at 12:00
4. Verify: Duration = 3 hours, Status = clocked_out

**Scenario 2: Historical Edit**
1. Admin edits attendance from 3 days ago
2. Changes status to "absent"
3. Period payout already calculated
4. Verify: Adjustment created for next payout

**Scenario 3: Monthly Report**
1. Generate report for Jan 2026
2. Mitra A: 18/20 attended (90%)
3. Verify: Matches payout calculation input

**Scenario 4: Timezone**
1. Clock in at 08:59:59 WIB
2. Verify: Stored as Asia/Jakarta time
3. Displayed correctly in UI

---

## Known Issues & Limitations

### Current
- Photo upload size limit: 5MB
- GPS accuracy depends on device
- No offline mode (requires internet)

### Workarounds
- Compress photos before upload
- GPS optional (not enforced)
- Manual entry if offline

---

## Future Enhancements

**Sprint 6+:**
1. Mobile app for easier clock in/out
2. Geofencing (auto clock-in when near location)
3. Face recognition for photo verification
4. Offline mode with sync
5. Push notifications for clock-in reminders
6. Integration with Google Maps for route tracking

---

## Related Documents

- **Payout System:** `docs/features/payout-system.md` (attendance data source)
- **Visit Tracking:** `docs/features/visit-tracking.md` (scheduled visits)
- **Client Feedback:** `docs/client/feedback-tracking.md` (Items 6a, 6b)
- **Database Schema:** `docs/technical/database-schema.md#attendance`
- **API Documentation:** `docs/technical/api-documentation.md#attendance`

---

**Document maintained by:** Handi  
**Last Major Update:** Sprint 4 (Feb 3, 2026)  
**Next Update:** Sprint 5 completion (Feb 17, 2026)