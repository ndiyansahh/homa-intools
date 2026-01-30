# Trial Management System

**Status:** 🔄 Refactoring (Sprint 5)  
**Last Updated:** 2025-01-29

---

## Overview

Free trial customer management with flexible trial date scheduling and conversion tracking.

---

## Current Status

### ✅ Implemented (Sprint 1-2)
- Trial customer creation
- Basic trial scheduling
- Trial-to-paid conversion
- Trial tracking in customer list

### 🔄 In Progress (Sprint 5 - 65%)
- **3a:** Single date selection (70%)
- **3b:** Unlimited trial dates (+) (60%)

### Current Behavior (Being Changed)
- Auto-generates 4 trial dates for 1-month period
- No flexibility for additional trials

### Target Behavior (Sprint 5)
- Select 1 trial date at a time
- Add unlimited additional trials with (+) button
- No auto-generation

---

## Implementation Details

### Files Being Refactored

**Frontend:**
- `src/components/trial-form.tsx` (major refactor)
- `src/app/app/trial/page.tsx` (minor updates)

**Backend:**
- `src/app/api/trials/create.ts` (validation updated)
- `src/lib/trial-scheduler.ts` (simplified logic)

**Database:**
- No schema changes needed
- Existing structure supports unlimited trials

---

## Database Schema
```sql
CREATE TABLE trial_customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  address TEXT,
  status VARCHAR(20) DEFAULT 'trial',  -- 'trial', 'converted', 'expired'
  trial_start_date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE trial_dates (
  id SERIAL PRIMARY KEY,
  trial_customer_id INTEGER REFERENCES trial_customers(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  assigned_mitra_id INTEGER REFERENCES mitras(id),
  status VARCHAR(20) DEFAULT 'scheduled',  -- 'scheduled', 'completed', 'cancelled'
  attended BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### POST /api/trials/create
**Status:** 🔄 Being Updated (Sprint 5)

**Old Request (Current):**
```json
{
  "customer": {
    "name": "John Doe",
    "phone": "08123456789",
    "address": "Jakarta"
  },
  "trial_type": "monthly",  // Auto-generates 4 dates
  "start_date": "2026-02-01"
}
```

**New Request (Sprint 5):**
```json
{
  "customer": {
    "name": "John Doe",
    "phone": "08123456789",
    "address": "Jakarta"
  },
  "trial_date": "2026-02-01",  // Single date only
  "trial_time": "09:00"
}
```

---

### POST /api/trials/[id]/add-date
**Status:** ⏳ New Endpoint (Sprint 5)

**Purpose:** Add additional trial dates (for 3b)

**Request:**
```json
{
  "trial_date": "2026-02-08",
  "trial_time": "09:00",
  "mitra_id": 5  // optional
}
```

**Response:**
```json
{
  "success": true,
  "trial_date_id": 123,
  "trial_customer_id": 45
}
```

---

### GET /api/trials
**Status:** ✅ Implemented

**Response:**
```json
{
  "trials": [
    {
      "id": 1,
      "name": "John Doe",
      "phone": "08123456789",
      "status": "trial",
      "trial_dates": [
        {
          "id": 10,
          "scheduled_date": "2026-02-01",
          "scheduled_time": "09:00",
          "attended": false,
          "assigned_mitra": {
            "id": 5,
            "name": "Ani Yulianti"
          }
        }
      ],
      "created_at": "2026-01-29T10:00:00Z"
    }
  ]
}
```

---

## UI Changes (Sprint 5)

### Before (Current):
```
┌─────────────────────────────┐
│ Add Trial Customer          │
├─────────────────────────────┤
│ Name: [_______________]     │
│ Phone: [______________]     │
│ Address: [____________]     │
│                             │
│ Trial Period:               │
│ ○ 1 Month (4 trials)        │
│ ○ 2 Weeks (2 trials)        │
│                             │
│ Start Date: [2026-02-01]    │
│ → Auto-generates 4 dates    │
│                             │
│ [Create Trial]              │
└─────────────────────────────┘
```

### After (Sprint 5):
```
┌─────────────────────────────┐
│ Add Trial Customer          │
├─────────────────────────────┤
│ Name: [_______________]     │
│ Phone: [______________]     │
│ Address: [____________]     │
│                             │
│ Trial Schedule:             │
│ Date: [2026-02-01] Time: [09:00] │
│                             │
│ [+ Add Another Date]        │ ← NEW (3b)
│                             │
│ [Create Trial]              │
└─────────────────────────────┘

After creation:
┌─────────────────────────────┐
│ Trial Customer: John Doe    │
├─────────────────────────────┤
│ Scheduled Trials:           │
│ • 2026-02-01 09:00          │
│                             │
│ [+ Add Another Trial Date]  │ ← NEW (3b)
│                             │
│ [Convert to Subscription]   │
└─────────────────────────────┘
```

---

## Client Feedback Implementation

### Feedback 3a: Single Date Selection ✅
**Status:** 🔄 70% Complete  
**Target:** Feb 10, 2026

**Changes:**
- Removed trial period selection (1 month, 2 weeks)
- Removed auto-generation of 4 dates
- Single date picker only
- Time selection added

**Files Modified:**
- `src/components/trial-form.tsx` (major refactor)
- `src/app/api/trials/create.ts` (simplified validation)

---

### Feedback 3b: Unlimited Trial Dates ✅
**Status:** 🔄 60% Complete  
**Target:** Feb 10, 2026

**Changes:**
- Add (+) button to add more trial dates
- No limit on number of trials
- Each trial date independent

**Files Modified:**
- `src/components/trial-form.tsx` (dynamic form fields)
- `src/app/api/trials/[id]/add-date.ts` (new endpoint)

---

## Testing

### Test Cases (Sprint 5)

**Test 1: Single Date Trial**
1. Create trial customer
2. Select single date & time
3. Submit
4. Verify: Only 1 trial date created

**Test 2: Add Additional Trial**
1. View existing trial customer
2. Click (+) Add Another Date
3. Select new date & time
4. Submit
5. Verify: New trial date added

**Test 3: Multiple Additions**
1. Add 5+ trial dates
2. Verify: All dates saved correctly
3. No limit enforced

---

## Known Issues

### Current (Being Fixed in Sprint 5)
- Auto-generation confuses clients
- Can't add trials beyond initial 4
- No flexibility in trial scheduling

### After Sprint 5
- Should be resolved ✅

---

## Related Documents

- **Client Feedback:** `docs/client/feedback-tracking.md` (Items 3a, 3b)
- **Customer Management:** `docs/features/customer-management.md`
- **Database Schema:** `docs/technical/database-schema.md#trials`

---

**Document maintained by:** Handi  
**Sprint 5 Target:** Feb 10, 2026