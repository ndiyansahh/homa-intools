/**
 * Payout System Type Definitions
 *
 * Central type definitions for the payout system including
 * period splitting, pro-rate calculations, and monthly breakdowns.
 */

// ============================================================================
// Core Payout Types
// ============================================================================

export interface Visit {
  id?: string
  scheduledDate: Date
  actualDate?: Date | null
  status?: 'pending' | 'completed' | 'cancelled'
  customerId?: string
  mitraId?: string
}

export interface InvoicePeriod {
  id: string
  customerId: string
  mitraId: string
  startDate: Date
  endDate: Date
  scheduledVisits: number
  actualVisits?: number
  monthlyRate: number
  totalPayout?: number
  status?: 'pending' | 'completed' | 'paid'
  createdAt?: Date
  updatedAt?: Date
}

export interface MonthlyPayout {
  month: number // 1-12
  year: number
  amount: number
  visitCount: number
  percentage: number // 0-100
  invoicePeriodId: string
}

export interface PayoutCalculation {
  invoicePeriodId: string
  mitraId: string
  customerId: string
  periodStart: Date
  periodEnd: Date
  scheduledVisits: number
  actualVisits: number
  monthlyRate: number
  totalPayout: number
  proRatePercentage: number
  monthlyBreakdown: MonthlyPayout[]
  calculatedAt: Date
}

// ============================================================================
// Database Record Types
// ============================================================================

export interface MonthlyPayoutRecord {
  id: string
  mitraId: string
  invoicePeriodId: string
  month: number
  year: number
  amount: number
  visitCount: number
  percentage: number
  isPaid: boolean
  paidAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PayoutSummary {
  mitraId: string
  mitraName: string
  month: number
  year: number
  totalAmount: number
  totalVisits: number
  invoiceCount: number
  invoicePeriods: {
    id: string
    customerId: string
    customerName: string
    amount: number
    visitCount: number
    percentage: number
  }[]
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CalculatePayoutRequest {
  invoicePeriodId: string
  actualVisits?: number // Optional: can be calculated from visit records
}

export interface CalculatePayoutResponse {
  success: boolean
  data?: PayoutCalculation
  error?: string
}

export interface GetMonthlyPayoutsRequest {
  mitraId?: string
  month?: number
  year?: number
  isPaid?: boolean
}

export interface GetMonthlyPayoutsResponse {
  success: boolean
  data?: MonthlyPayoutRecord[]
  summary?: PayoutSummary
  error?: string
}

// ============================================================================
// Utility Types
// ============================================================================

export interface MonthYear {
  month: number // 1-12
  year: number
}

export interface PayoutValidation {
  valid: boolean
  errors: string[]
  warnings?: string[]
}

export interface PeriodSplitResult {
  totalPayout: number
  totalVisits: number
  monthlyBreakdown: MonthlyPayout[]
  validation: PayoutValidation
}

// ============================================================================
// Component Props Types
// ============================================================================

export interface PayoutTableProps {
  payouts: MonthlyPayoutRecord[]
  onPaymentComplete?: (payoutId: string) => void
  loading?: boolean
}

export interface MonthlyPayoutCardProps {
  summary: PayoutSummary
  onViewDetails?: () => void
  onExportPDF?: () => void
}

// ============================================================================
// Filter and Sort Types
// ============================================================================

export type PayoutSortField = 'date' | 'amount' | 'mitra' | 'customer'
export type PayoutSortDirection = 'asc' | 'desc'

export interface PayoutFilters {
  mitraId?: string
  customerId?: string
  month?: number
  year?: number
  isPaid?: boolean
  minAmount?: number
  maxAmount?: number
}

export interface PayoutSort {
  field: PayoutSortField
  direction: PayoutSortDirection
}

// ============================================================================
// Type Guards
// ============================================================================

export function isValidMonthlyPayout(obj: unknown): obj is MonthlyPayout {
  if (typeof obj !== 'object' || obj === null) return false

  const payout = obj as Record<string, unknown>

  return (
    typeof payout.month === 'number' &&
    payout.month >= 1 &&
    payout.month <= 12 &&
    typeof payout.year === 'number' &&
    payout.year > 2000 &&
    typeof payout.amount === 'number' &&
    payout.amount >= 0 &&
    typeof payout.visitCount === 'number' &&
    payout.visitCount >= 0 &&
    typeof payout.percentage === 'number' &&
    payout.percentage >= 0 &&
    payout.percentage <= 100 &&
    typeof payout.invoicePeriodId === 'string'
  )
}

export function isValidInvoicePeriod(obj: unknown): obj is InvoicePeriod {
  if (typeof obj !== 'object' || obj === null) return false

  const period = obj as Record<string, unknown>

  return (
    typeof period.id === 'string' &&
    typeof period.customerId === 'string' &&
    typeof period.mitraId === 'string' &&
    period.startDate instanceof Date &&
    period.endDate instanceof Date &&
    typeof period.scheduledVisits === 'number' &&
    period.scheduledVisits > 0 &&
    typeof period.monthlyRate === 'number' &&
    period.monthlyRate > 0
  )
}

// ============================================================================
// Constants
// ============================================================================

export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
] as const

export const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
] as const

export type MonthName = typeof MONTHS[number]
export type MonthShort = typeof MONTHS_SHORT[number]

// ============================================================================
// Helper Functions
// ============================================================================

export function getMonthName(month: number, short = false): string {
  if (month < 1 || month > 12) throw new Error('Invalid month: must be 1-12')
  return short ? MONTHS_SHORT[month - 1] : MONTHS[month - 1]
}

export function formatPayoutAmount(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export function formatPayoutPeriod(startDate: Date, endDate: Date): string {
  const startDay = startDate.getDate()
  const endDay = endDate.getDate()
  const startMonth = getMonthName(startDate.getMonth() + 1, true)
  const endMonth = getMonthName(endDate.getMonth() + 1, true)
  const startYear = startDate.getFullYear()
  const endYear = endDate.getFullYear()

  if (startYear === endYear) {
    if (startMonth === endMonth) {
      return `${startDay}-${endDay} ${startMonth} ${startYear}`
    }
    return `${startDay} ${startMonth} - ${endDay} ${endMonth} ${startYear}`
  }
  return `${startDay} ${startMonth} ${startYear} - ${endDay} ${endMonth} ${endYear}`
}
