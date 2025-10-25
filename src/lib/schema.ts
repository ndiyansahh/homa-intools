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
  subscriptionPackage: varchar('subscription_package', { length: 255 }).notNull(), // Full package name with details
  pricePerQty: varchar('price_per_qty', { length: 50 }).notNull(), // Price in string format like "Rp1,125,000"
  priceNumeric: decimal('price_numeric', { precision: 10, scale: 2 }).notNull(), // Price in numeric format for calculations
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
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
  isActive: boolean('is_active').default(true),
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Mitra (Cleaner/Partner) Table - Matching actual database structure
export const mitraDB = pgTable('mitra_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  mitraName: varchar('mitra_name', { length: 255 }).notNull(),
  contact: varchar('contact', { length: 20 }).notNull(),
  address: text('address').notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  village: varchar('village', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  
  // Mitra details
  mitraType: varchar('mitra_type', { length: 20 }).notNull().default('Cleaner'),
  status: varchar('status', { length: 20 }).default('Active'),
  
  // Financial details
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }).notNull(),
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

// Trial Table - for managing trial customers
export const trialDB = pgTable('trial_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  acquisition: varchar('acquisition', { length: 20 }).notNull(), // HOMA, Altrix
  address: text('address').notNull(),
  district: varchar('district', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  postalCode: varchar('postal_code', { length: 10 }).notNull(),
  residentialType: varchar('residential_type', { length: 50 }).notNull(), // House, Office Space, Apartment
  notes: text('notes'),
  
  // Metadata
  isDeleted: boolean('is_deleted').default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Trial Assignment Table - for tracking multiple trial attempts per customer
export const trialAssignmentDB = pgTable('trial_assignment_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  trialId: uuid('trial_id').references(() => trialDB.id).notNull(),
  
  // Trial details
  trialDate: date('trial_date').notNull(),
  assignedCleaner: varchar('assigned_cleaner', { length: 100 }).notNull(),
  status: varchar('status', { length: 30 }).default('Not Converted'), // Converted, Not Converted, Stalling/Postpone, Cancelled
  reasonForNotConverting: text('reason_for_not_converting'),
  
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Trial Relations
export const trialRelations = relations(trialDB, ({ many }) => ({
  assignments: many(trialAssignmentDB),
}));

export const trialAssignmentRelations = relations(trialAssignmentDB, ({ one }) => ({
  trial: one(trialDB, {
    fields: [trialAssignmentDB.trialId],
    references: [trialDB.id],
  }),
}));

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

export type Trial = typeof trialDB.$inferSelect;
export type NewTrial = typeof trialDB.$inferInsert;

export type TrialAssignment = typeof trialAssignmentDB.$inferSelect;
export type NewTrialAssignment = typeof trialAssignmentDB.$inferInsert;