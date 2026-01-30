# Customer Management System

**Status:** ✅ Implemented (Sprint 2)  
**Last Updated:** 2025-01-29  
**Owner:** Handi

---

## Overview

Comprehensive customer management system handling both trial customers and subscription customers with lifecycle tracking.

---

## Customer Lifecycle
```
┌────────────┐
│ Trial      │ → Free trial period (1+ visits)
└─────┬──────┘
      │
      ├─ Convert → ┌────────────┐
      │            │ Active     │ → Paying subscription
      │            └─────┬──────┘
      │                  │
      │                  ├─ Pause → ┌────────────┐
      │                  │           │ Paused     │
      │                  │           └─────┬──────┘
      │                  │                 │
      │                  │         Resume ─┘
      │                  │
      │                  └─ End → ┌────────────┐
      │                            │ Expired    │
      │                            └────────────┘
      │
      └─ Not Convert → ┌────────────┐
                       │ Trial Lost │
                       └────────────┘
```

---

## Current Implementation Status

### ✅ Implemented Features (Sprint 2)

#### 1. Customer CRUD Operations
**Files:**
- `src/app/app/customers/page.tsx` - Customer list
- `src/app/app/customers/create/page.tsx` - Create form
- `src/app/app/customers/[id]/page.tsx` - Customer detail
- `src/app/app/customers/[id]/edit/page.tsx` - Edit form
- `src/app/api/customers/*` - API endpoints

**Features:**
- Create customer (trial or direct subscription)
- View customer details
- Edit customer information
- Archive/deactivate customer
- Customer search & filters

---

#### 2. Trial to Subscription Conversion
**Files:**
- `src/components/trial-conversion-form.tsx`
- `src/app/api/customers/[id]/convert/route.ts`

**Features:**
- One-click conversion
- Subscription package selection
- Schedule setup
- Mitra assignment
- Start date configuration

---

#### 3. Subscription Management
**Files:**
- `src/app/app/customers/[id]/subscription/page.tsx`
- `src/app/api/customers/[id]/subscription/*`

**Features:**
- Package selection (Basic/Regular/Frequent)
- Schedule configuration
- Billing cycle setup
- Pause/resume subscription
- Cancellation handling

---

#### 4. Customer List with Filters
**Files:**
- `src/app/app/customers/page.tsx`
- `src/components/customer-filters.tsx`

**Filters:**
- Status (trial, active, paused, expired)
- Package type
- Mitra assigned
- Search by name/phone
- Date range (created date)

---

### ⏳ Planned Features (Sprint 6)

#### Feedback 7a: Invoice ID Display
**Target:** Sprint 6  
**Files to Update:**
- `src/app/app/customers/page.tsx` (add column)
- `src/components/customer-table.tsx` (show invoice code)

**Format:** `INV/Cleaning/YYYY.MM.DD-####`

---

## Database Schema

### Tables

**customers**
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  
  -- Customer Type
  type VARCHAR(20) NOT NULL,  -- 'trial', 'subscription'
  
  -- Trial Info (if type = 'trial')
  trial_status VARCHAR(20),  -- 'active', 'expired', 'converted'
  trial_start_date DATE,
  trial_notes TEXT,
  
  -- Subscription Info (if type = 'subscription')
  subscription_status VARCHAR(20),  -- 'active', 'paused', 'expired', 'cancelled'
  subscription_package VARCHAR(50),  -- 'basic', 'regular', 'frequent'
  subscription_start_date DATE,
  subscription_end_date DATE,
  
  -- Billing
  billing_cycle VARCHAR(20),  -- 'monthly', 'quarterly', 'yearly'
  next_billing_date DATE,
  
  -- Assignment
  assigned_mitra_id INTEGER REFERENCES mitras(id),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id),
  
  -- Soft delete
  deleted_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_customers_type ON customers(type);
CREATE INDEX idx_customers_status ON customers(subscription_status);
CREATE INDEX idx_customers_mitra ON customers(assigned_mitra_id);
CREATE INDEX idx_customers_phone ON customers(phone);
```

**subscriptions** (Detailed subscription history)
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  
  -- Package Details
  package_type VARCHAR(50) NOT NULL,  -- 'basic', 'regular', 'frequent'
  price DECIMAL(10,2) NOT NULL,
  frequency INTEGER NOT NULL,  -- visits per week
  
  -- Period
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active',  -- 'active', 'paused', 'cancelled', 'expired'
  
  -- Pause tracking
  paused_at TIMESTAMP,
  pause_reason TEXT,
  resumed_at TIMESTAMP,
  
  -- Cancellation
  cancelled_at TIMESTAMP,
  cancellation_reason TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**customer_notes**
```sql
CREATE TABLE customer_notes (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  note TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## API Endpoints

### GET /api/customers
**Status:** ✅ Implemented  
**Auth:** Required (ALL roles)

**Query Parameters:**
- `type` (optional): trial, subscription
- `status` (optional): active, paused, expired, cancelled
- `package` (optional): basic, regular, frequent
- `mitra_id` (optional): Filter by assigned mitra
- `search` (optional): Search by name/phone
- `page` (default: 1)
- `per_page` (default: 20)

**Response:**
```json
{
  "customers": [
    {
      "id": 1,
      "name": "John Doe",
      "phone": "08123456789",
      "address": "Jakarta Selatan",
      "type": "subscription",
      "subscription_status": "active",
      "subscription_package": "regular",
      "subscription_start_date": "2026-01-01",
      "assigned_mitra": {
        "id": 5,
        "name": "Ani Yulianti"
      },
      "next_billing_date": "2026-02-01",
      "created_at": "2025-12-15T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 150,
    "page": 1,
    "per_page": 20,
    "total_pages": 8
  }
}
```

---

### POST /api/customers/create
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request (Trial Customer):**
```json
{
  "name": "John Doe",
  "phone": "08123456789",
  "email": "john@example.com",  // optional
  "address": "Jakarta Selatan",
  "type": "trial",
  "trial_start_date": "2026-02-01",
  "trial_notes": "Referral from friend"
}
```

**Request (Direct Subscription):**
```json
{
  "name": "Jane Smith",
  "phone": "08198765432",
  "email": "jane@example.com",
  "address": "Jakarta Utara",
  "type": "subscription",
  "subscription_package": "regular",
  "subscription_start_date": "2026-02-01",
  "assigned_mitra_id": 5
}
```

**Response:**
```json
{
  "success": true,
  "customer_id": 123,
  "type": "subscription",
  "message": "Customer created successfully"
}
```

---

### GET /api/customers/[id]
**Status:** ✅ Implemented  
**Auth:** Required (ALL roles)

**Response:**
```json
{
  "customer": {
    "id": 123,
    "name": "Jane Smith",
    "phone": "08198765432",
    "email": "jane@example.com",
    "address": "Jakarta Utara",
    "type": "subscription",
    "subscription": {
      "status": "active",
      "package": "regular",
      "frequency": 2,  // times per week
      "price": 1200000,
      "start_date": "2026-01-01",
      "next_billing_date": "2026-02-01"
    },
    "assigned_mitra": {
      "id": 5,
      "name": "Ani Yulianti",
      "phone": "08155555555"
    },
    "scheduled_visits": [
      {
        "id": 456,
        "scheduled_date": "2026-01-29",
        "scheduled_time": "09:00",
        "status": "scheduled"
      }
    ],
    "total_visits": 24,
    "completed_visits": 22,
    "notes": [
      {
        "id": 10,
        "note": "Customer prefers morning visits",
        "created_by": "Admin",
        "created_at": "2026-01-15T10:00:00Z"
      }
    ],
    "created_at": "2025-12-01T08:00:00Z"
  }
}
```

---

### PUT /api/customers/[id]
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "name": "Jane Smith Updated",  // optional
  "phone": "08198765432",         // optional
  "email": "jane.new@example.com", // optional
  "address": "New Address",        // optional
  "assigned_mitra_id": 6           // optional
}
```

**Response:**
```json
{
  "success": true,
  "customer_id": 123,
  "updated_fields": ["name", "assigned_mitra_id"]
}
```

---

### POST /api/customers/[id]/convert
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Purpose:** Convert trial customer to paid subscription

**Request:**
```json
{
  "subscription_package": "regular",
  "subscription_start_date": "2026-02-01",
  "assigned_mitra_id": 5,
  "schedule": {
    "days": ["monday", "thursday"],  // For 2x/week
    "time": "09:00"
  }
}
```

**Response:**
```json
{
  "success": true,
  "customer_id": 123,
  "subscription_id": 789,
  "message": "Customer converted successfully",
  "next_steps": [
    "Schedule visits created",
    "First invoice generated",
    "Mitra assigned"
  ]
}
```

---

### POST /api/customers/[id]/subscription/pause
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "reason": "Customer traveling for 2 months",
  "resume_date": "2026-04-01"  // optional
}
```

**Response:**
```json
{
  "success": true,
  "subscription_id": 789,
  "paused_at": "2026-01-29T14:30:00Z",
  "resume_date": "2026-04-01",
  "scheduled_visits_cancelled": 8
}
```

---

### POST /api/customers/[id]/subscription/resume
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Response:**
```json
{
  "success": true,
  "subscription_id": 789,
  "resumed_at": "2026-02-01T09:00:00Z",
  "scheduled_visits_recreated": 8
}
```

---

### POST /api/customers/[id]/subscription/cancel
**Status:** ✅ Implemented  
**Auth:** Required (ADMIN, OWNER)

**Request:**
```json
{
  "reason": "Customer moving out of service area",
  "effective_date": "2026-02-28"  // optional, default: today
}
```

**Response:**
```json
{
  "success": true,
  "subscription_id": 789,
  "cancelled_at": "2026-01-29T15:00:00Z",
  "effective_date": "2026-02-28",
  "final_invoice_date": "2026-02-28",
  "scheduled_visits_cancelled": 4
}
```

---

### POST /api/customers/[id]/notes
**Status:** ✅ Implemented  
**Auth:** Required (ALL roles)

**Request:**
```json
{
  "note": "Customer prefers no pets in cleaning area"
}
```

**Response:**
```json
{
  "success": true,
  "note_id": 20,
  "created_at": "2026-01-29T16:00:00Z"
}
```

---

## Code Examples

### Customer List with Filters
```typescript
// src/app/app/customers/page.tsx

import { db } from '@/lib/db';
import { customers, mitras } from '@/lib/db/schema';
import { and, eq, like, or } from 'drizzle-orm';

export default async function CustomersPage({
  searchParams
}: {
  searchParams: { 
    type?: string;
    status?: string;
    search?: string;
  }
}) {
  // Build where conditions
  const conditions = [];
  
  if (searchParams.type) {
    conditions.push(eq(customers.type, searchParams.type));
  }
  
  if (searchParams.status) {
    conditions.push(eq(customers.subscription_status, searchParams.status));
  }
  
  if (searchParams.search) {
    conditions.push(
      or(
        like(customers.name, `%${searchParams.search}%`),
        like(customers.phone, `%${searchParams.search}%`)
      )
    );
  }
  
  // Query with filters
  const customerList = await db.query.customers.findMany({
    where: and(...conditions),
    with: {
      assigned_mitra: true,
      subscription: true
    },
    orderBy: (customers, { desc }) => [desc(customers.created_at)]
  });
  
  return (
    <div>
      <CustomerFilters />
      <CustomerTable customers={customerList} />
    </div>
  );
}
```

---

### Trial to Subscription Conversion
```typescript
// src/app/api/customers/[id]/convert/route.ts

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  const customerId = parseInt(params.id);
  const { subscription_package, subscription_start_date, assigned_mitra_id, schedule } 
    = await req.json();
  
  // Start transaction
  await db.transaction(async (tx) => {
    // 1. Update customer type
    await tx.update(customers)
      .set({
        type: 'subscription',
        subscription_status: 'active',
        subscription_package,
        subscription_start_date,
        assigned_mitra_id,
        trial_status: 'converted'
      })
      .where(eq(customers.id, customerId));
    
    // 2. Create subscription record
    const [subscription] = await tx.insert(subscriptions).values({
      customer_id: customerId,
      package_type: subscription_package,
      price: getPackagePrice(subscription_package),
      frequency: getPackageFrequency(subscription_package),
      start_date: subscription_start_date,
      status: 'active'
    }).returning();
    
    // 3. Create scheduled visits based on schedule
    const visits = generateScheduledVisits({
      customer_id: customerId,
      mitra_id: assigned_mitra_id,
      start_date: subscription_start_date,
      days: schedule.days,
      time: schedule.time,
      frequency: getPackageFrequency(subscription_package)
    });
    
    await tx.insert(scheduledVisits).values(visits);
    
    // 4. Generate first invoice
    await generateInvoice(tx, customerId, subscription.id);
  });
  
  return Response.json({
    success: true,
    customer_id: customerId,
    message: 'Customer converted successfully'
  });
}
```

---

## UI Screens

### 1. Customer List Page
**Location:** `/app/customers`  
**File:** `src/app/app/customers/page.tsx`

**Features:**
- Search bar (name, phone)
- Filter dropdowns (type, status, package)
- Customer table:
  - Name
  - Phone
  - Type (Trial/Subscription)
  - Status
  - Package
  - Assigned Mitra
  - ⏳ Invoice ID (Sprint 6)
  - Actions (View, Edit, Convert)
- Pagination
- Export to CSV
- "Add Customer" button

---

### 2. Customer Detail Page
**Location:** `/app/customers/[id]`  
**File:** `src/app/app/customers/[id]/page.tsx`

**Tabs:**
1. **Overview**
   - Basic information
   - Subscription details
   - Assigned mitra
   - Quick actions

2. **Visit History**
   - All scheduled visits
   - Completed vs scheduled
   - Attendance status
   - See: `docs/features/visit-tracking.md`

3. **Billing**
   - Invoice history
   - Payment status
   - Next billing date

4. **Notes**
   - Customer notes chronologically
   - Add note form

---

### 3. Create Customer Page
**Location:** `/app/customers/create`  
**File:** `src/app/app/customers/create/page.tsx`

**Form:**
```
┌─────────────────────────────────┐
│ Add New Customer                │
├─────────────────────────────────┤
│ Customer Type:                  │
│ ○ Trial Customer                │
│ ○ Direct Subscription           │
│                                 │
│ Name: [_________________]       │
│ Phone: [________________]       │
│ Email: [________________]       │
│ Address: [______________]       │
│                                 │
│ [If Trial selected]             │
│ Trial Start Date: [2026-02-01]  │
│ Notes: [________________]       │
│                                 │
│ [If Subscription selected]      │
│ Package: [Regular ▼]            │
│ Start Date: [2026-02-01]        │
│ Assign Mitra: [Ani Yulianti ▼]  │
│ Schedule:                       │
│ ☑ Monday [09:00]                │
│ ☐ Tuesday                       │
│ ☐ Wednesday                     │
│ ☑ Thursday [09:00]              │
│ ☐ Friday                        │
│ ☐ Saturday                      │
│ ☐ Sunday                        │
│                                 │
│ [Create Customer]               │
└─────────────────────────────────┘
```

---

### 4. Trial Conversion Modal
**Location:** Modal on customer detail page  
**File:** `src/components/trial-conversion-form.tsx`

**Features:**
- Package selection (Basic/Regular/Frequent)
- Price display
- Start date picker
- Mitra selection
- Schedule configuration
- One-click convert

---

## Integration with Other Features

### 1. Visit Scheduling
- Customer creation → Auto-create scheduled visits
- Package determines frequency
- See: `docs/features/visit-tracking.md`

### 2. Invoicing
- Subscription start → Generate invoice
- Billing cycle → Recurring invoices
- See: `docs/features/invoice-system.md` (to be created)

### 3. Mitra Assignment
- Customer → Assigned mitra
- Scheduled visits → Same mitra
- See: `docs/features/attendance.md`

---

## Client Feedback Implementation

### ⏳ Feedback 7a: Invoice ID in Customer List
**Status:** ⏳ Planned (Sprint 6)  
**Target:** Feb 24, 2026

**Current:** Customer list doesn't show invoice code  
**Planned:** Add "Invoice ID" column

**Format:** `INV/Cleaning/YYYY.MM.DD-####`

---

## Testing

### Test Scenarios

**Scenario 1: Create Trial Customer**
1. Fill form with trial details
2. Submit
3. Verify: Customer created with type = 'trial'
4. Verify: No scheduled visits created yet

**Scenario 2: Convert Trial to Subscription**
1. Open trial customer detail
2. Click "Convert to Subscription"
3. Select Regular package, assign mitra
4. Confirm
5. Verify: Type changed to 'subscription'
6. Verify: Scheduled visits created
7. Verify: Invoice generated

**Scenario 3: Pause Subscription**
1. Open active customer
2. Click "Pause Subscription"
3. Enter reason & resume date
4. Confirm
5. Verify: Status = 'paused'
6. Verify: Future visits cancelled

**Scenario 4: Customer Search**
1. Enter partial phone number
2. Verify: Matching customers shown
3. Filter by package type
4. Verify: Only Regular package customers shown

---

## Known Issues & Limitations

### Current
- No LTV (Lifetime Value) tracking yet
- No customer retention analytics
- No automated churn prediction
- Email notifications not implemented

### Planned Improvements
- Customer retention dashboard
- Automated re-engagement campaigns
- Referral tracking
- Customer satisfaction surveys

---

## Related Documents

- **Trial Management:** `docs/features/trial-management.md`
- **Visit Tracking:** `docs/features/visit-tracking.md`
- **Payout System:** `docs/features/payout-system.md`
- **Client Feedback:** `docs/client/feedback-tracking.md` (Item 7a)
- **Database Schema:** `docs/technical/database-schema.md#customers`

---

**Document maintained by:** Handi  
**Last Major Update:** Sprint 2 (Jan 10, 2026)  
**Next Update:** Sprint 6 (Invoice ID feature)