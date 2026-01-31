# HOMA Database Schema Documentation

**Database:** PostgreSQL 15  
**ORM:** Drizzle ORM  
**Host:** Neon (Serverless PostgreSQL)  
**Last Updated:** January 31, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Entity Relationship Diagram](#entity-relationship-diagram)
3. [Tables](#tables)
4. [Indexes](#indexes)
5. [Constraints](#constraints)
6. [Migrations](#migrations)
7. [Timezone Handling](#timezone-handling)

---

## Overview

### Database Statistics

**Current State (Sprint 5):**
- Total Tables: 14
- Total Indexes: 28
- Database Size: ~2 GB
- Estimated Growth: ~500 MB/month

**Key Design Principles:**
- Normalized structure (3NF)
- Soft deletes (no hard deletes)
- Audit trails for financial data
- Asia/Jakarta timezone enforced
- Foreign key constraints enabled

---

## Entity Relationship Diagram
```
┌─────────────┐
│   users     │
└──────┬──────┘
       │
       │ created_by
       ↓
┌─────────────┐        ┌──────────────┐
│  customers  │────────│subscriptions │
└──────┬──────┘   1:N  └──────────────┘
       │
       │ 1:N
       ↓
┌──────────────────┐
│ scheduled_visits │
└────────┬─────────┘
         │
         │ 1:1
         ↓
┌──────────────────┐      ┌─────────────┐
│attendance_records│──────│   mitras    │
└──────────────────┘ N:1  └──────┬──────┘
                                 │
                                 │ 1:N
                                 ↓
                          ┌─────────────┐
                          │   payouts   │
                          └──────┬──────┘
                                 │
                                 │ 1:N
                                 ↓
                          ┌──────────────────┐
                          │payout_adjustments│
                          └──────────────────┘
```

---

## Tables

### 1. user_db (ADR 0002)

**Purpose:** Authentication and user management with security features

**Schema:**
```sql
CREATE TABLE user_db (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'STAFF' CHECK (role IN ('ADMIN', 'OWNER', 'STAFF')),
  
  -- Security fields (ADR 0002)
  must_change_password BOOLEAN NOT NULL DEFAULT TRUE,
  failed_login_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMP,
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_user_db_email ON user_db(email);
CREATE INDEX idx_user_db_role ON user_db(role);
CREATE INDEX idx_user_db_active ON user_db(is_active);
```

**Sample Data:**
```sql
INSERT INTO user_db (email, password_hash, role, must_change_password) VALUES
('admin@homa.com', '$2b$10$...', 'ADMIN', FALSE),
('owner@homa.com', '$2b$10$...', 'OWNER', FALSE),
('staff@homa.com', '$2b$10$...', 'STAFF', FALSE);
```

**Drizzle Schema:**
```typescript
// src/lib/schema.ts
export const userDB = pgTable('user_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('STAFF'),
  
  // Security fields (ADR 0002)
  mustChangePassword: boolean('must_change_password').default(true).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until', { mode: 'date' }),
  
  // Metadata
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});
```

**Security Features (ADR 0002):**
- `must_change_password`: Forces password change on first login
- `failed_login_attempts`: Tracks failed logins (locks after 5)
- `locked_until`: Account lockout timestamp (15 min duration)

**Relationships:**
- One-to-Many: user → customers (created_by)
- One-to-Many: user → attendance_records (edited_by)

---

### 2. customers

**Purpose:** Store customer information (both trial and subscription)

**Schema:**
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20) NOT NULL,
  address TEXT NOT NULL,
  
  -- Customer Type
  type VARCHAR(20) NOT NULL CHECK (type IN ('trial', 'subscription')),
  
  -- Trial Info
  trial_status VARCHAR(20) CHECK (trial_status IN ('active', 'expired', 'converted')),
  trial_start_date DATE,
  trial_notes TEXT,
  
  -- Subscription Info
  subscription_status VARCHAR(20) CHECK (subscription_status IN ('active', 'paused', 'expired', 'cancelled')),
  subscription_package VARCHAR(50) CHECK (subscription_package IN ('basic', 'regular', 'frequent')),
  subscription_start_date DATE,
  subscription_end_date DATE,
  
  -- Billing
  billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'quarterly', 'yearly')),
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
```

**Indexes:**
```sql
CREATE INDEX idx_customers_type ON customers(type);
CREATE INDEX idx_customers_subscription_status ON customers(subscription_status);
CREATE INDEX idx_customers_mitra ON customers(assigned_mitra_id);
CREATE INDEX idx_customers_phone ON customers(phone);
CREATE INDEX idx_customers_deleted ON customers(deleted_at);
```

**Drizzle Schema:**
```typescript
export const customers = pgTable('customers', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(),
  address: text('address').notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  trialStatus: varchar('trial_status', { length: 20 }),
  trialStartDate: date('trial_start_date'),
  trialNotes: text('trial_notes'),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  subscriptionPackage: varchar('subscription_package', { length: 50 }),
  subscriptionStartDate: date('subscription_start_date'),
  subscriptionEndDate: date('subscription_end_date'),
  billingCycle: varchar('billing_cycle', { length: 20 }),
  nextBillingDate: date('next_billing_date'),
  assignedMitraId: integer('assigned_mitra_id').references(() => mitras.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id),
  deletedAt: timestamp('deleted_at')
});
```

**Sample Query:**
```typescript
// Get active subscription customers
const activeCustomers = await db.query.customers.findMany({
  where: and(
    eq(customers.type, 'subscription'),
    eq(customers.subscriptionStatus, 'active'),
    isNull(customers.deletedAt)
  ),
  with: {
    assignedMitra: true
  }
});
```

---

### 3. mitras

**Purpose:** Store mitra (staff) information

**Schema:**
```sql
CREATE TABLE mitras (
  id SERIAL PRIMARY KEY,
  
  -- Basic Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) NOT NULL,
  
  -- Payout
  base_rate_monthly DECIMAL(10,2) NOT NULL DEFAULT 800000,
  
  -- User Account
  user_id INTEGER REFERENCES users(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Soft delete
  deleted_at TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_mitras_status ON mitras(status);
CREATE INDEX idx_mitras_user ON mitras(user_id);
CREATE INDEX idx_mitras_deleted ON mitras(deleted_at);
```

**Constraints:**
```sql
-- Base rate must be positive
ALTER TABLE mitras ADD CONSTRAINT check_base_rate_positive 
  CHECK (base_rate_monthly > 0);
```

**Drizzle Schema:**
```typescript
export const mitras = pgTable('mitras', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).unique(),
  phone: varchar('phone', { length: 20 }).notNull(),
  baseRateMonthly: decimal('base_rate_monthly', { precision: 10, scale: 2 })
    .notNull()
    .default('800000'),
  userId: integer('user_id').references(() => users.id),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at')
});
```

**Sample Data:**
```sql
INSERT INTO mitras (name, phone, base_rate_monthly) VALUES
('Ani Yulianti', '08123456789', 900000.00),
('Budi Santoso', '08198765432', 850000.00);
```

---

### 4. scheduled_visits

**Purpose:** Track scheduled cleaning visits

**Schema:**
```sql
CREATE TABLE scheduled_visits (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  mitra_id INTEGER REFERENCES mitras(id),
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  scheduled_day VARCHAR(20), -- 'monday', 'tuesday', etc.
  duration_minutes INTEGER DEFAULT 180,
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'missed', 'cancelled', 'rescheduled'
  )),
  
  -- Completion
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
```

**Indexes:**
```sql
CREATE INDEX idx_visits_customer ON scheduled_visits(customer_id);
CREATE INDEX idx_visits_mitra ON scheduled_visits(mitra_id);
CREATE INDEX idx_visits_date ON scheduled_visits(scheduled_date);
CREATE INDEX idx_visits_status ON scheduled_visits(status);
CREATE INDEX idx_visits_customer_date ON scheduled_visits(customer_id, scheduled_date);
```

**Note on Constraint:**
```sql
-- Previously had UNIQUE(customer_id, scheduled_date, scheduled_day)
-- REMOVED in Sprint 6 to allow same-day multiple visits
-- NO LONGER ENFORCED
```

**Drizzle Schema:**
```typescript
export const scheduledVisits = pgTable('scheduled_visits', {
  id: serial('id').primaryKey(),
  customerId: integer('customer_id').references(() => customers.id).notNull(),
  mitraId: integer('mitra_id').references(() => mitras.id),
  scheduledDate: date('scheduled_date').notNull(),
  scheduledTime: time('scheduled_time').notNull(),
  scheduledDay: varchar('scheduled_day', { length: 20 }),
  durationMinutes: integer('duration_minutes').default(180),
  status: varchar('status', { length: 20 }).default('scheduled'),
  completedAt: timestamp('completed_at'),
  completedBy: integer('completed_by').references(() => users.id),
  attendanceRecordId: integer('attendance_record_id').references(() => attendanceRecords.id),
  cancelledAt: timestamp('cancelled_at'),
  cancellationReason: text('cancellation_reason'),
  rescheduledTo: integer('rescheduled_to').references(() => scheduledVisits.id),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id)
});
```

**Sample Query:**
```typescript
// Get upcoming visits for a mitra
const upcomingVisits = await db.query.scheduledVisits.findMany({
  where: and(
    eq(scheduledVisits.mitraId, mitraId),
    gte(scheduledVisits.scheduledDate, today),
    eq(scheduledVisits.status, 'scheduled')
  ),
  with: {
    customer: true
  },
  orderBy: [asc(scheduledVisits.scheduledDate), asc(scheduledVisits.scheduledTime)]
});
```

---

### 5. attendance_records

**Purpose:** Track mitra clock in/out for visits

**Schema:**
```sql
CREATE TABLE attendance_records (
  id SERIAL PRIMARY KEY,
  
  -- Relations
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
  status VARCHAR(20) DEFAULT 'clocked_in' CHECK (status IN (
    'clocked_in', 'clocked_out', 'absent'
  )),
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_attendance_mitra ON attendance_records(mitra_id);
CREATE INDEX idx_attendance_visit ON attendance_records(scheduled_visit_id);
CREATE INDEX idx_attendance_mitra_date ON attendance_records(mitra_id, clock_in_time);
CREATE INDEX idx_attendance_status ON attendance_records(status);
```

**Drizzle Schema:**
```typescript
export const attendanceRecords = pgTable('attendance_records', {
  id: serial('id').primaryKey(),
  mitraId: integer('mitra_id').references(() => mitras.id).notNull(),
  scheduledVisitId: integer('scheduled_visit_id').references(() => scheduledVisits.id),
  customerId: integer('customer_id').references(() => customers.id),
  clockInTime: timestamp('clock_in_time').notNull(),
  clockOutTime: timestamp('clock_out_time'),
  clockInLat: decimal('clock_in_lat', { precision: 10, scale: 8 }),
  clockInLng: decimal('clock_in_lng', { precision: 11, scale: 8 }),
  clockOutLat: decimal('clock_out_lat', { precision: 10, scale: 8 }),
  clockOutLng: decimal('clock_out_lng', { precision: 11, scale: 8 }),
  clockInPhotoUrl: text('clock_in_photo_url'),
  clockOutPhotoUrl: text('clock_out_photo_url'),
  status: varchar('status', { length: 20 }).default('clocked_in'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});
```

**Sample Query:**
```typescript
// Get attendance for a month
const monthlyAttendance = await db.query.attendanceRecords.findMany({
  where: and(
    eq(attendanceRecords.mitraId, mitraId),
    gte(attendanceRecords.clockInTime, monthStart),
    lte(attendanceRecords.clockInTime, monthEnd),
    eq(attendanceRecords.status, 'clocked_out')
  ),
  orderBy: desc(attendanceRecords.clockInTime)
});
```

---

### 6. payouts

**Purpose:** Store monthly payout calculations for mitras

**Schema:**
```sql
CREATE TABLE payouts (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  mitra_id INTEGER REFERENCES mitras(id) NOT NULL,
  
  -- Period
  period_month VARCHAR(7) NOT NULL, -- 'YYYY-MM' format
  
  -- Calculation
  base_rate DECIMAL(10,2) NOT NULL,
  scheduled_visits INTEGER NOT NULL,
  actual_visits INTEGER NOT NULL,
  calculated_amount DECIMAL(10,2) NOT NULL,
  
  -- Adjustments
  bonus DECIMAL(10,2) DEFAULT 0,
  deductions DECIMAL(10,2) DEFAULT 0,
  adjustment DECIMAL(10,2) DEFAULT 0, -- From payout_adjustments
  
  -- Final
  final_amount DECIMAL(10,2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN (
    'draft', 'approved', 'paid'
  )),
  
  -- Payment
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  approved_by INTEGER REFERENCES users(id),
  approved_at TIMESTAMP
);
```

**Indexes:**
```sql
CREATE INDEX idx_payouts_mitra ON payouts(mitra_id);
CREATE INDEX idx_payouts_period ON payouts(period_month);
CREATE INDEX idx_payouts_status ON payouts(status);
CREATE UNIQUE INDEX idx_payouts_mitra_period ON payouts(mitra_id, period_month);
```

**Constraints:**
```sql
-- Final amount must be non-negative
ALTER TABLE payouts ADD CONSTRAINT check_final_amount_nonnegative 
  CHECK (final_amount >= 0);

-- Scheduled visits must be positive
ALTER TABLE payouts ADD CONSTRAINT check_scheduled_positive 
  CHECK (scheduled_visits > 0);
```

**Drizzle Schema:**
```typescript
export const payouts = pgTable('payouts', {
  id: serial('id').primaryKey(),
  mitraId: integer('mitra_id').references(() => mitras.id).notNull(),
  periodMonth: varchar('period_month', { length: 7 }).notNull(),
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }).notNull(),
  scheduledVisits: integer('scheduled_visits').notNull(),
  actualVisits: integer('actual_visits').notNull(),
  calculatedAmount: decimal('calculated_amount', { precision: 10, scale: 2 }).notNull(),
  bonus: decimal('bonus', { precision: 10, scale: 2 }).default('0'),
  deductions: decimal('deductions', { precision: 10, scale: 2 }).default('0'),
  adjustment: decimal('adjustment', { precision: 10, scale: 2 }).default('0'),
  finalAmount: decimal('final_amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).default('draft'),
  paidAt: timestamp('paid_at'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  approvedBy: integer('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at')
});
```

**Sample Calculation:**
```typescript
// Generate payout
const payout = {
  mitra_id: 5,
  period_month: '2026-01',
  base_rate: 900000,
  scheduled_visits: 8,
  actual_visits: 7,
  calculated_amount: (7/8) * 900000, // = 787,500
  bonus: 0,
  deductions: 0,
  adjustment: -100000, // From previous month
  final_amount: 787500 - 100000, // = 687,500
  status: 'draft'
};
```

---

### 7. payout_adjustments

**Purpose:** Track payout adjustments (carry forward/back)

**Schema:**
```sql
CREATE TABLE payout_adjustments (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  payout_id INTEGER REFERENCES payouts(id) NOT NULL,
  related_visit_id INTEGER REFERENCES scheduled_visits(id),
  
  -- Adjustment
  reason TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL, -- Positive = add, Negative = deduct
  applied_to_period VARCHAR(7) NOT NULL, -- Which period this applies to
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_adjustments_payout ON payout_adjustments(payout_id);
CREATE INDEX idx_adjustments_period ON payout_adjustments(applied_to_period);
CREATE INDEX idx_adjustments_visit ON payout_adjustments(related_visit_id);
```

**Drizzle Schema:**
```typescript
export const payoutAdjustments = pgTable('payout_adjustments', {
  id: serial('id').primaryKey(),
  payoutId: integer('payout_id').references(() => payouts.id).notNull(),
  relatedVisitId: integer('related_visit_id').references(() => scheduledVisits.id),
  reason: text('reason').notNull(),
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  appliedToPeriod: varchar('applied_to_period', { length: 7 }).notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  createdBy: integer('created_by').references(() => users.id)
});
```

**Sample Entry:**
```sql
INSERT INTO payout_adjustments (payout_id, reason, amount, applied_to_period) VALUES
(123, 'Jan 31 visit marked missed after payout', -100000.00, '2026-02');
```

---

### 8. payout_rate_configs

**Purpose:** Configurable payout rates (Sprint 4+)

**Schema:**
```sql
CREATE TABLE payout_rate_configs (
  id SERIAL PRIMARY KEY,
  
  -- Package
  package_type VARCHAR(50) NOT NULL CHECK (package_type IN (
    'basic', 'regular', 'frequent'
  )),
  
  -- Rate
  base_rate DECIMAL(10,2) NOT NULL,
  
  -- Effective Dates
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL = ongoing
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_rate_configs_package ON payout_rate_configs(package_type);
CREATE INDEX idx_rate_configs_effective ON payout_rate_configs(effective_from);
```

**Constraints:**
```sql
-- Base rate must be positive
ALTER TABLE payout_rate_configs ADD CONSTRAINT check_rate_positive 
  CHECK (base_rate > 0);

-- effective_to must be after effective_from
ALTER TABLE payout_rate_configs ADD CONSTRAINT check_effective_dates 
  CHECK (effective_to IS NULL OR effective_to > effective_from);
```

**Sample Data:**
```sql
INSERT INTO payout_rate_configs (package_type, base_rate, effective_from) VALUES
('basic', 600000.00, '2026-01-01'),
('regular', 1200000.00, '2026-01-01'),
('frequent', 1800000.00, '2026-01-01');
```

---

### 9. visit_edit_history

**Purpose:** Audit trail for visit edits (Sprint 4+)

**Schema:**
```sql
CREATE TABLE visit_edit_history (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  visit_id INTEGER REFERENCES scheduled_visits(id) NOT NULL,
  edited_by INTEGER REFERENCES users(id) NOT NULL,
  
  -- Changes
  field_changed VARCHAR(50) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  
  -- Reason
  reason TEXT NOT NULL,
  
  -- Impact
  payout_adjustment_triggered BOOLEAN DEFAULT FALSE,
  adjustment_amount DECIMAL(10,2),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_visit_edits_visit ON visit_edit_history(visit_id);
CREATE INDEX idx_visit_edits_date ON visit_edit_history(created_at);
```

**Sample Entry:**
```sql
INSERT INTO visit_edit_history (
  visit_id, edited_by, field_changed, old_value, new_value, 
  reason, payout_adjustment_triggered, adjustment_amount
) VALUES (
  456, 1, 'status', 'completed', 'missed', 
  'Customer confirmed mitra did not attend', 
  TRUE, -100000.00
);
```

---

### 10. trial_dates

**Purpose:** Store trial visit dates (Sprint 5+)

**Schema:**
```sql
CREATE TABLE trial_dates (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  
  -- Schedule
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  
  -- Assignment
  assigned_mitra_id INTEGER REFERENCES mitras(id),
  
  -- Status
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'completed', 'cancelled'
  )),
  attended BOOLEAN DEFAULT FALSE,
  
  -- Notes
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_trial_dates_customer ON trial_dates(customer_id);
CREATE INDEX idx_trial_dates_date ON trial_dates(scheduled_date);
CREATE INDEX idx_trial_dates_status ON trial_dates(status);
```

---

### 11. subscriptions

**Purpose:** Detailed subscription history

**Schema:**
```sql
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  
  -- Package
  package_type VARCHAR(50) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  frequency INTEGER NOT NULL, -- visits per week
  
  -- Period
  start_date DATE NOT NULL,
  end_date DATE,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
    'active', 'paused', 'cancelled', 'expired'
  )),
  
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

**Indexes:**
```sql
CREATE INDEX idx_subscriptions_customer ON subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_dates ON subscriptions(start_date, end_date);
```

---

### 12. customer_notes

**Purpose:** Store notes about customers

**Schema:**
```sql
CREATE TABLE customer_notes (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  
  -- Content
  note TEXT NOT NULL,
  
  -- Metadata
  created_by INTEGER REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE INDEX idx_customer_notes_customer ON customer_notes(customer_id);
CREATE INDEX idx_customer_notes_date ON customer_notes(created_at);
```

---

### 13. invoices

**Purpose:** Store customer invoices

**Schema:**
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  customer_id INTEGER REFERENCES customers(id) NOT NULL,
  subscription_id INTEGER REFERENCES subscriptions(id),
  
  -- Invoice Details
  invoice_code VARCHAR(100) UNIQUE NOT NULL, -- INV/Cleaning/YYYY.MM.DD-####
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Amounts
  subtotal DECIMAL(10,2) NOT NULL,
  tax DECIMAL(10,2) DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  
  -- Status
  status VARCHAR(20) DEFAULT 'unpaid' CHECK (status IN (
    'draft', 'sent', 'unpaid', 'paid', 'overdue', 'cancelled'
  )),
  
  -- Payment
  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Indexes:**
```sql
CREATE UNIQUE INDEX idx_invoices_code ON invoices(invoice_code);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_period ON invoices(period_start, period_end);
```

**Invoice Code Format:**
```
INV/Cleaning/YYYY.MM.DD-####

Example: INV/Cleaning/2026.01.29-0001
```

---

### 14. subscription_packages

**Purpose:** Configurable subscription packages (Sprint 6+)

**Schema:**
```sql
CREATE TABLE subscription_packages (
  id SERIAL PRIMARY KEY,
  
  -- Package Details
  name VARCHAR(100) NOT NULL,
  frequency_per_week INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  description TEXT,
  
  -- Status
  active BOOLEAN DEFAULT TRUE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER REFERENCES users(id)
);
```

**Indexes:**
```sql
CREATE INDEX idx_packages_active ON subscription_packages(active);
```

**Constraints:**
```sql
ALTER TABLE subscription_packages ADD CONSTRAINT check_frequency_positive 
  CHECK (frequency_per_week > 0);

ALTER TABLE subscription_packages ADD CONSTRAINT check_price_positive 
  CHECK (price > 0);
```

**Sample Data:**
```sql
INSERT INTO subscription_packages (name, frequency_per_week, price, description) VALUES
('Basic', 1, 600000.00, '1x per week cleaning'),
('Regular', 2, 1200000.00, '2x per week cleaning'),
('Frequent', 3, 1800000.00, '3x per week cleaning');
```

---

## Indexes

### Performance Indexes

**Query Optimization:**
```sql
-- Most queried relationships
CREATE INDEX idx_visits_customer_mitra ON scheduled_visits(customer_id, mitra_id);
CREATE INDEX idx_attendance_mitra_month ON attendance_records(mitra_id, date_trunc('month', clock_in_time));

-- Common filters
CREATE INDEX idx_customers_active ON customers(subscription_status) 
  WHERE deleted_at IS NULL AND subscription_status = 'active';

-- Search optimization
CREATE INDEX idx_customers_search ON customers USING gin(to_tsvector('english', name || ' ' || phone));
```

**Current Index Count:** 28 indexes  
**Average Query Time:** <50ms for most queries  
**Slow Query Threshold:** >500ms (none currently)

---

## Constraints

### Foreign Keys

**Cascading Deletes:**
```sql
-- Customer deleted → all visits deleted
ALTER TABLE scheduled_visits 
  DROP CONSTRAINT scheduled_visits_customer_id_fkey,
  ADD CONSTRAINT scheduled_visits_customer_id_fkey 
    FOREIGN KEY (customer_id) 
    REFERENCES customers(id) 
    ON DELETE CASCADE;

-- Similar for trial_dates, customer_notes
```

**Restrict Deletes:**
```sql
-- Cannot delete mitra if has payouts
ALTER TABLE payouts 
  ADD CONSTRAINT payouts_mitra_id_fkey 
    FOREIGN KEY (mitra_id) 
    REFERENCES mitras(id) 
    ON DELETE RESTRICT;
```

---

### Check Constraints

**Business Rules:**
```sql
-- Customer must have either trial or subscription info
ALTER TABLE customers ADD CONSTRAINT check_customer_type 
  CHECK (
    (type = 'trial' AND trial_status IS NOT NULL) OR
    (type = 'subscription' AND subscription_status IS NOT NULL)
  );

-- Phone number format (Indonesia)
ALTER TABLE customers ADD CONSTRAINT check_phone_format 
  CHECK (phone ~ '^08[0-9]{8,11}$');

-- Email format
ALTER TABLE users ADD CONSTRAINT check_email_format 
  CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');
```

---

## Migrations

### Migration System

**Tool:** Drizzle Kit  
**Migration Path:** `drizzle/migrations/`  
**Naming:** `NNNN_description.sql` (e.g., `0001_create_users.sql`)

**Generate Migration:**
```bash
drizzle-kit generate:pg
```

**Apply Migration:**
```bash
drizzle-kit push:pg
```

---

### Migration History

**0001 - Initial Schema (Dec 2025):**
- Created users, customers, mitras tables
- Basic authentication setup

**0002 - Visit System (Jan 2026):**
- Added scheduled_visits, attendance_records
- Indexes for performance

**0003 - Payout System (Jan 2026):**
- Added payouts table
- Pro-rate calculation support

**0004 - Payout Improvements (Feb 2026):**
- Added payout_rate_configs
- Added payout_adjustments
- Added visit_edit_history

**0005 - Trial System Update (Feb 2026):**
- Added trial_dates table
- Refactored customer trial fields

**0006 - Remove Unique Constraint (Planned):**
- Remove UNIQUE constraint from scheduled_visits
- Allow same-day multiple visits

---

### Rollback Strategy

**Backup Before Migration:**
```bash
# Neon: Automatic continuous backup
# Manual backup:
pg_dump $DATABASE_URL > backup-$(date +%Y%m%d).sql
```

**Rollback Migration:**
```bash
# Neon: Point-in-time restore to before migration
# Or manually:
psql $DATABASE_URL < backup-YYYYMMDD.sql
```

---

## Timezone Handling

### Critical: Asia/Jakarta Enforced

**Database Timezone:**
```sql
-- Set for entire database
ALTER DATABASE homa SET timezone TO 'Asia/Jakarta';

-- Or per session
SET TIME ZONE 'Asia/Jakarta';
```

**Application Layer:**
```typescript
// Always use timezone utilities
import { getCurrentJakartaTime } from '@/lib/date-utils';

const now = getCurrentJakartaTime(); // Always Asia/Jakarta
```

**See:** `docs/adrs/0005-asia-jakarta-timezone.md`

---

## Database Maintenance

### Regular Tasks

**Weekly:**
- [ ] Review slow query log
- [ ] Check index usage (pg_stat_user_indexes)
- [ ] Monitor table sizes

**Monthly:**
- [ ] VACUUM ANALYZE (Neon auto-handles)
- [ ] Review and archive old data (if needed)
- [ ] Check for missing indexes

**Quarterly:**
- [ ] Full database review
- [ ] Optimization opportunities
- [ ] Schema refactoring needs

---

### Monitoring Queries

**Table Sizes:**
```sql
SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

**Index Usage:**
```sql
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE idx_scan = 0
ORDER BY pg_relation_size(indexrelid) DESC;
```

**Slow Queries:**
```sql
SELECT 
  query,
  mean_time,
  calls,
  total_time
FROM pg_stat_statements
WHERE mean_time > 100 -- queries > 100ms
ORDER BY mean_time DESC
LIMIT 20;
```

---

## Backup & Recovery

### Backup Strategy

**Automatic (Neon):**
- Continuous backup
- Point-in-time restore (7 days free tier, 30 days paid)
- No manual intervention needed

**Manual Backup:**
```bash
# Full database dump
pg_dump $DATABASE_URL > backup-full-$(date +%Y%m%d).sql

# Schema only
pg_dump --schema-only $DATABASE_URL > schema-$(date +%Y%m%d).sql

# Data only
pg_dump --data-only $DATABASE_URL > data-$(date +%Y%m%d).sql
```

**Storage:**
- Local: Project folder (gitignored)
- Cloud: Google Drive backup folder
- Frequency: Before each major deployment

---

### Restore Process

**Point-in-Time (Neon):**
1. Go to Neon dashboard
2. Select "Restore"
3. Choose timestamp
4. Create new branch or restore to main

**From Backup File:**
```bash
# Drop existing database (DANGEROUS!)
dropdb homa

# Create new database
createdb homa

# Restore from backup
psql homa < backup-YYYYMMDD.sql
```

---

## Related Documents

- **ADR 0001:** Use Drizzle ORM
- **ADR 0003:** Neon PostgreSQL
- **ADR 0005:** Asia/Jakarta Timezone
- **API Documentation:** `docs/technical/api-documentation.md`
- **Deployment Guide:** `docs/technical/deployment-guide.md`

---

**Document Version:** 1.0  
**Last Updated:** February 7, 2026  
**Maintained By:** Handi (Developer)  
**Next Review:** March 1, 2026 (after Sprint 6)