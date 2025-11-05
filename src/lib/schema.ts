import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  decimal,
  integer,
  boolean,
  serial,
  index,
  primaryKey,
  date,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Region Table - Master Data
export const regionDB = pgTable('region_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionName: varchar('region_name', { length: 255 }).notNull(),
  province: varchar('province', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  village: varchar('village', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }).notNull(),
  isActive: boolean('is_active').default(true),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Subscription Package Table - Master Data
export const subscriptionPackageDB = pgTable('subscription_package_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  subscriptionPackage: varchar('subscription_package', { length: 255 }).notNull(),
  pricePerQty: varchar('price_per_qty', { length: 50 }).notNull(),
  priceNumeric: decimal('price_numeric', { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Customer Table - matching exact database structure
export const customerDB = pgTable('customer_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  contact: varchar('contact', { length: 20 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  village: varchar('village', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  // residentialType: varchar('residential_type', { length: 50 }).default('House'), // TODO: Enable after database migration
  // Cleaner assignment fields
  assignedMitraId: uuid('assigned_mitra_id').references(() => mitraDB.id),
  backupMitraId: uuid('backup_mitra_id').references(() => mitraDB.id),
  subscriptionPackageId: uuid('subscription_package_id').references(() => subscriptionPackageDB.id),
  subscriptionPackage: varchar('subscription_package', { length: 255 }),
  subscriptionStart: date('subscription_start'),
  subscriptionEnd: date('subscription_end'),
  subscriptionStatus: varchar('subscription_status', { length: 30 }).default('Active'),
  monthlyFee: decimal('monthly_fee', { precision: 10, scale: 2 }).default('0'),
  totalPaid: decimal('total_paid', { precision: 10, scale: 2 }).default('0'),
  outstandingBalance: decimal('outstanding_balance', { precision: 10, scale: 2 }).default('0'),
  customerNotes: text('customer_notes'),
  totalSessions: integer('total_sessions').default(0),
  chosenDays: text('chosen_days'), // JSON string of selected days
  dayPattern: text('day_pattern'), // JSON: {"day1":"Monday","day2":"Friday","day3":null}
  ltv: integer('ltv').default(0), // Lifetime Value in months
  isActive: boolean('is_active').default(true),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Mitra (Cleaner/Partner) Table - Updated with comprehensive fields
export const mitraDB = pgTable('mitra_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  mitraName: varchar('mitra_name', { length: 255 }).notNull(),
  
  // Core identification
  mitraCode: varchar('mitra_code', { length: 50 }).unique().notNull(), // MITRA-YEARMONTH-SEQUENCE
  mitraNIK: varchar('mitra_nik', { length: 16 }).unique().notNull(), // 16 digit national ID
  mitraGender: varchar('mitra_gender', { length: 10 }).notNull(), // Wanita, Pria
  mitraDOB: varchar('mitra_dob', { length: 10 }).notNull(), // mm/dd/yyyy format
  mitraPhone: varchar('mitra_phone', { length: 12 }).notNull(), // 10-12 digits
  
  // Legacy contact and address (keeping for backward compatibility)
  contact: varchar('contact', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  district: varchar('district', { length: 100 }),
  village: varchar('village', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  
  // Banking information
  mitraBankAccount: text('mitra_bank_account'), // Free text (e.g., "BCA")
  mitraBankHolderName: varchar('mitra_bank_holder_name', { length: 255 }), // Free text
  mitraBankAccountNumber: varchar('mitra_bank_account_number', { length: 50 }), // Bank account number
  
  // Assignment details
  mitraCityAssignment: varchar('mitra_city_assignment', { length: 100 }), // Jabodetabek cities
  mitraLocationAssignment: text('mitra_location_assignment'), // JSON array of districts ["Sudirman", "Kuningan"]
  mitraPartnership: varchar('mitra_partnership', { length: 20 }).notNull().default('Full Time'), // Full Time, Part Time
  mitraTenure: integer('mitra_tenure').default(0), // Free number (years/months)
  mitraExitDate: varchar('mitra_exit_date', { length: 10 }), // dd/mm/yyyy format
  mitraBonusCommission: varchar('mitra_bonus_commission', { length: 20 }).default('Eligible'), // Eligible, Not Eligible
  
  // Legacy mitra details (keeping for backward compatibility)
  mitraType: varchar('mitra_type', { length: 20 }).notNull().default('Cleaner'),
  status: varchar('status', { length: 20 }).default('Active'),
  
  // Financial details
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }).default('0'),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }).default('10.00'),
  totalEarnings: decimal('total_earnings', { precision: 12, scale: 2 }).default('0'),
  totalVisits: integer('total_visits').default(0),
  
  // Performance metrics
  rating: decimal('rating', { precision: 2, scale: 1 }).default('0'),
  totalReviews: integer('total_reviews').default(0),
  
  // Metadata
  joinDate: date('join_date').defaultNow(),
  lastVisitDate: date('last_visit_date'),
  mitraNotes: text('mitra_notes'),
  isActive: boolean('is_active').default(true),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Invoice Table
export const invoiceDB = pgTable('invoice_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceNumber: varchar('invoice_number', { length: 50 }).unique().notNull(),
  customerId: uuid('customer_id').references(() => customerDB.id).notNull(),
  
  // Invoice details
  invoiceDate: timestamp('invoice_date').defaultNow(),
  dueDate: timestamp('due_date'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull(),
  tax: decimal('tax', { precision: 10, scale: 2 }).default('0'),
  discount: decimal('discount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).default('Pending'), // Pending, Paid, Overdue, Cancelled
  paidAt: timestamp('paid_at'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  
  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

// Attendance Schedule Table
export const attendanceScheduleDB = pgTable('attendance_schedule_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customerDB.id).notNull(),
  mitraId: uuid('mitra_id').references(() => mitraDB.id).notNull(),
  
  // Schedule details
  scheduledDate: timestamp('scheduled_date').notNull(),
  scheduledTime: varchar('scheduled_time', { length: 10 }), // HH:MM format
  duration: integer('duration').default(120), // minutes
  
  // Status
  status: varchar('status', { length: 20 }).default('Scheduled'), // Scheduled, Completed, Cancelled, No-Show
  notes: text('notes'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

// Attendance Record Table
export const attendanceRecordDB = pgTable('attendance_record_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  scheduleId: uuid('schedule_id').references(() => attendanceScheduleDB.id),
  customerId: uuid('customer_id').references(() => customerDB.id).notNull(),
  mitraId: uuid('mitra_id').references(() => mitraDB.id).notNull(),
  
  // Client info (denormalized for reporting)
  clientName: varchar('client_name', { length: 100 }).notNull(),
  address: text('address').notNull(),
  package: varchar('package', { length: 100 }).notNull(),
  
  // Date info
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  newEndDate: timestamp('new_end_date'), // For extensions
  
  // Cleaner assignments
  cleaner1: varchar('cleaner1', { length: 100 }).notNull(),
  cleaner2: varchar('cleaner2', { length: 100 }),
  
  // Attendance details
  checkInTime: timestamp('check_in_time'),
  checkOutTime: timestamp('check_out_time'),
  actualDuration: integer('actual_duration'), // minutes
  workQuality: varchar('work_quality', { length: 20 }), // Excellent, Good, Fair, Poor
  
  // Status and notes
  status: varchar('status', { length: 20 }).default('Scheduled'), // Scheduled, In-Progress, Completed, Cancelled
  notes: text('notes'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

// Mitra Payout Table
export const mitraPayoutDB = pgTable('mitra_payout_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  mitraId: uuid('mitra_id').references(() => mitraDB.id).notNull(),
  
  // Payout period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  
  // Calculation details
  totalVisits: integer('total_visits').default(0),
  totalHours: decimal('total_hours', { precision: 8, scale: 2 }).default('0'),
  baseAmount: decimal('base_amount', { precision: 12, scale: 2 }).default('0'),
  commissionAmount: decimal('commission_amount', { precision: 12, scale: 2 }).default('0'),
  bonusAmount: decimal('bonus_amount', { precision: 10, scale: 2 }).default('0'),
  deductionAmount: decimal('deduction_amount', { precision: 10, scale: 2 }).default('0'),
  totalAmount: decimal('total_amount', { precision: 12, scale: 2 }).notNull(),
  
  // Status
  status: varchar('status', { length: 20 }).default('Pending'), // Pending, Approved, Paid, Rejected
  approvedBy: varchar('approved_by', { length: 100 }),
  approvedAt: timestamp('approved_at'),
  paidAt: timestamp('paid_at'),
  paymentMethod: varchar('payment_method', { length: 50 }),
  paymentReference: varchar('payment_reference', { length: 100 }),
  
  // Metadata
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
});

// Visit Table - Individual visit tracking for subscriptions
export const visitDB = pgTable('visit_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: uuid('customer_id').references(() => customerDB.id).notNull(),
  mitraId: uuid('mitra_id').references(() => mitraDB.id).notNull(),
  
  // Visit details
  visitNumber: integer('visit_number').notNull(), // 1, 2, 3, etc.
  scheduledDate: date('scheduled_date').notNull(), // YYYY-MM-DD
  scheduledDay: varchar('scheduled_day', { length: 10 }).notNull(), // Monday, Tuesday, etc.
  actualDate: date('actual_date'), // Nullable - when visit actually happened
  
  // Status and execution
  status: varchar('status', { length: 20 }).default('Scheduled'), // "Scheduled" | "Pending" | "Done" | "Cancelled"
  durationHours: integer('duration_hours').default(3),
  visitNotes: text('visit_notes'),
  
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

// Simple Relations without problematic references
export const customerRelations = relations(customerDB, ({ one, many }) => ({
  subscriptionPackage: one(subscriptionPackageDB, {
    fields: [customerDB.subscriptionPackageId],
    references: [subscriptionPackageDB.id],
  }),
  assignedMitra: one(mitraDB, {
    fields: [customerDB.assignedMitraId],
    references: [mitraDB.id],
  }),
  backupMitra: one(mitraDB, {
    fields: [customerDB.backupMitraId],
    references: [mitraDB.id],
  }),
  invoices: many(invoiceDB),
  attendanceSchedules: many(attendanceScheduleDB),
  attendanceRecords: many(attendanceRecordDB),
  visits: many(visitDB),
}));

export const subscriptionPackageRelations = relations(subscriptionPackageDB, ({ many }) => ({
  customers: many(customerDB),
}));

export const invoiceRelations = relations(invoiceDB, ({ one }) => ({
  customer: one(customerDB, {
    fields: [invoiceDB.customerId],
    references: [customerDB.id],
  }),
}));

export const mitraRelations = relations(mitraDB, ({ many }) => ({
  attendanceSchedules: many(attendanceScheduleDB),
  attendanceRecords: many(attendanceRecordDB),
  payouts: many(mitraPayoutDB),
  visits: many(visitDB),
}));

export const visitRelations = relations(visitDB, ({ one }) => ({
  customer: one(customerDB, {
    fields: [visitDB.customerId],
    references: [customerDB.id],
  }),
  mitra: one(mitraDB, {
    fields: [visitDB.mitraId],
    references: [mitraDB.id],
  }),
}));

export const attendanceScheduleRelations = relations(attendanceScheduleDB, ({ one, many }) => ({
  customer: one(customerDB, {
    fields: [attendanceScheduleDB.customerId],
    references: [customerDB.id],
  }),
  mitra: one(mitraDB, {
    fields: [attendanceScheduleDB.mitraId],
    references: [mitraDB.id],
  }),
  attendanceRecords: many(attendanceRecordDB),
}));

export const attendanceRecordRelations = relations(attendanceRecordDB, ({ one }) => ({
  schedule: one(attendanceScheduleDB, {
    fields: [attendanceRecordDB.scheduleId],
    references: [attendanceScheduleDB.id],
  }),
  customer: one(customerDB, {
    fields: [attendanceRecordDB.customerId],
    references: [customerDB.id],
  }),
  mitra: one(mitraDB, {
    fields: [attendanceRecordDB.mitraId],
    references: [mitraDB.id],
  }),
}));

export const mitraPayoutRelations = relations(mitraPayoutDB, ({ one }) => ({
  mitra: one(mitraDB, {
    fields: [mitraPayoutDB.mitraId],
    references: [mitraDB.id],
  }),
}));

// Note: Trial data is stored in customer_db with subscription_status = 'Trial'
// No separate trial tables needed since trials are just customers with Trial status

// Export types for TypeScript
export type Region = typeof regionDB.$inferSelect;
export type NewRegion = typeof regionDB.$inferInsert;

export type SubscriptionPackage = typeof subscriptionPackageDB.$inferSelect;
export type NewSubscriptionPackage = typeof subscriptionPackageDB.$inferInsert;

export type Customer = typeof customerDB.$inferSelect;
export type NewCustomer = typeof customerDB.$inferInsert;

export type Mitra = typeof mitraDB.$inferSelect;
export type NewMitra = typeof mitraDB.$inferInsert;

export type Invoice = typeof invoiceDB.$inferSelect;
export type NewInvoice = typeof invoiceDB.$inferInsert;

export type AttendanceSchedule = typeof attendanceScheduleDB.$inferSelect;
export type NewAttendanceSchedule = typeof attendanceScheduleDB.$inferInsert;

export type AttendanceRecord = typeof attendanceRecordDB.$inferSelect;
export type NewAttendanceRecord = typeof attendanceRecordDB.$inferInsert;

export type MitraPayout = typeof mitraPayoutDB.$inferSelect;
export type NewMitraPayout = typeof mitraPayoutDB.$inferInsert;

export type Visit = typeof visitDB.$inferSelect;
export type NewVisit = typeof visitDB.$inferInsert;

// Trial types removed - trials are now just customers with subscription_status = 'Trial'