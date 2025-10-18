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
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Region Table - Master Data
export const regionDB = pgTable('region_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  regionName: varchar('region_name', { length: 100 }).notNull(),
  province: varchar('province', { length: 100 }).notNull(),
  city: varchar('city', { length: 100 }).notNull(),
  district: varchar('district', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  regionNameIdx: index('region_name_idx').on(table.regionName),
  cityIdx: index('city_idx').on(table.city),
}));

// Subscription Package Table - Master Data
export const subscriptionPackageDB = pgTable('subscription_package_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  packageName: varchar('package_name', { length: 100 }).notNull(),
  packageType: varchar('package_type', { length: 50 }).notNull(), // Regular, Frequent, Special, Basic
  visitsPerWeek: integer('visits_per_week').notNull(),
  pricePerVisit: decimal('price_per_visit', { precision: 10, scale: 2 }),
  totalPrice: decimal('total_price', { precision: 10, scale: 2 }),
  duration: integer('duration').default(30), // days
  isActive: boolean('is_active').default(true),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  packageTypeIdx: index('package_type_idx').on(table.packageType),
}));

// Customer Table
export const customerDB = pgTable('customer_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  no: serial('no'),
  customerName: varchar('customer_name', { length: 100 }).notNull(),
  acquisition: varchar('acquisition', { length: 20 }).notNull(), // HOMA, Altrix
  contact: varchar('contact', { length: 20 }),
  address: text('address').notNull(),
  village: varchar('village', { length: 100 }),
  district: varchar('district', { length: 100 }),
  city: varchar('city', { length: 100 }),
  postalCode: varchar('postal_code', { length: 10 }),
  residentialType: varchar('residential_type', { length: 50 }), // House, Office Space, Apartment
  
  // Subscription info
  subscriptionPackageId: uuid('subscription_package_id').references(() => subscriptionPackageDB.id),
  qtyPackage: integer('qty_package').default(1),
  ltv: decimal('ltv', { precision: 12, scale: 2 }),
  firstDateSubscription: timestamp('first_date_subscription'),
  
  // Status and assignment
  status: varchar('status', { length: 20 }).default('Active'), // Active, Churn, Inactive, Pending
  cleaner1Id: uuid('cleaner1_id').references(() => mitraDB.id),
  cleaner2Id: uuid('cleaner2_id').references(() => mitraDB.id),
  
  // Churn info
  churnTag: varchar('churn_tag', { length: 20 }).default('N/A'), // Internal, External, N/A
  churnReason: text('churn_reason'),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
}, (table) => ({
  customerNameIdx: index('customer_name_idx').on(table.customerName),
  acquisitionIdx: index('acquisition_idx').on(table.acquisition),
  statusIdx: index('status_idx').on(table.status),
  cityIdx: index('customer_city_idx').on(table.city),
}));

// Mitra (Cleaner/Partner) Table
export const mitraDB = pgTable('mitra_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  no: serial('no'),
  mitraName: varchar('mitra_name', { length: 100 }).notNull(),
  contact: varchar('contact', { length: 20 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  mitraType: varchar('mitra_type', { length: 20 }).notNull(), // Cleaner, Supervisor, etc
  status: varchar('status', { length: 20 }).default('Active'), // Active, Inactive, Suspended
  joinDate: timestamp('join_date').defaultNow(),
  
  // Rate and payment info
  baseRate: decimal('base_rate', { precision: 10, scale: 2 }),
  commissionRate: decimal('commission_rate', { precision: 5, scale: 2 }),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isDeleted: boolean('is_deleted').default(false),
}, (table) => ({
  mitraNameIdx: index('mitra_name_idx').on(table.mitraName),
  mitraTypeIdx: index('mitra_type_idx').on(table.mitraType),
  statusIdx: index('mitra_status_idx').on(table.status),
}));

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
}, (table) => ({
  invoiceNumberIdx: index('invoice_number_idx').on(table.invoiceNumber),
  customerIdIdx: index('invoice_customer_idx').on(table.customerId),
  statusIdx: index('invoice_status_idx').on(table.status),
  invoiceDateIdx: index('invoice_date_idx').on(table.invoiceDate),
}));

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
}, (table) => ({
  customerIdIdx: index('schedule_customer_idx').on(table.customerId),
  mitraIdIdx: index('schedule_mitra_idx').on(table.mitraId),
  scheduledDateIdx: index('scheduled_date_idx').on(table.scheduledDate),
  statusIdx: index('schedule_status_idx').on(table.status),
}));

// Attendance Record Table
export const attendanceRecordDB = pgTable('attendance_record_db', {
  id: uuid('id').defaultRandom().primaryKey(),
  no: serial('no'),
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
}, (table) => ({
  clientNameIdx: index('record_client_name_idx').on(table.clientName),
  customerIdIdx: index('record_customer_idx').on(table.customerId),
  mitraIdIdx: index('record_mitra_idx').on(table.mitraId),
  startDateIdx: index('record_start_date_idx').on(table.startDate),
  statusIdx: index('record_status_idx').on(table.status),
}));

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
}, (table) => ({
  mitraIdIdx: index('payout_mitra_idx').on(table.mitraId),
  periodIdx: index('payout_period_idx').on(table.periodStart, table.periodEnd),
  statusIdx: index('payout_status_idx').on(table.status),
}));

// Relations
export const customerRelations = relations(customerDB, ({ one, many }) => ({
  subscriptionPackage: one(subscriptionPackageDB, {
    fields: [customerDB.subscriptionPackageId],
    references: [subscriptionPackageDB.id],
  }),
  cleaner1: one(mitraDB, {
    fields: [customerDB.cleaner1Id],
    references: [mitraDB.id],
    relationName: 'cleaner1',
  }),
  cleaner2: one(mitraDB, {
    fields: [customerDB.cleaner2Id],
    references: [mitraDB.id],
    relationName: 'cleaner2',
  }),
  invoices: many(invoiceDB),
  attendanceSchedules: many(attendanceScheduleDB),
  attendanceRecords: many(attendanceRecordDB),
}));

export const mitraRelations = relations(mitraDB, ({ many }) => ({
  customersAsCleaner1: many(customerDB, { relationName: 'cleaner1' }),
  customersAsCleaner2: many(customerDB, { relationName: 'cleaner2' }),
  attendanceSchedules: many(attendanceScheduleDB),
  attendanceRecords: many(attendanceRecordDB),
  payouts: many(mitraPayoutDB),
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