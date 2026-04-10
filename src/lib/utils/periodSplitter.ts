/**
 * Period Splitter Utility
 *
 * Splits invoice period payouts across calendar months based on visit distribution.
 *
 * Example:
 * Invoice Period: 6-Jan to 5-Feb, 4 total visits
 * - January: 3 visits (6-Jan to 31-Jan) = 75%
 * - February: 1 visit (1-Feb to 5-Feb) = 25%
 */

/**
 * Convert date to Asia/Jakarta timezone
 * Inline implementation to avoid dependency on missing date-utils module
 */
function toJakartaTime(date: Date): Date {
  const jakartaDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
  return jakartaDate
}

export interface Visit {
  scheduledDate: Date
  // Other visit fields can be added as needed
}

export interface MonthlyPayout {
  month: number // 1-12
  year: number
  amount: number
  visitCount: number
  percentage: number // 0-100
  invoicePeriodId: string
}

interface MonthYear {
  month: number
  year: number
}

/**
 * Extract month and year from a date in Jakarta timezone
 */
export function getMonthYearFromDate(date: Date): MonthYear {
  const jakartaDate = toJakartaTime(date)
  return {
    month: jakartaDate.getMonth() + 1, // 0-indexed to 1-indexed
    year: jakartaDate.getFullYear()
  }
}

/**
 * Create a unique key for month-year combination
 */
function getMonthYearKey(monthYear: MonthYear): string {
  return `${monthYear.year}-${String(monthYear.month).padStart(2, '0')}`
}

/**
 * Group visits by calendar month
 */
export function groupVisitsByMonth(visits: Visit[]): Map<string, Visit[]> {
  const grouped = new Map<string, Visit[]>()

  for (const visit of visits) {
    const monthYear = getMonthYearFromDate(visit.scheduledDate)
    const key = getMonthYearKey(monthYear)

    if (!grouped.has(key)) {
      grouped.set(key, [])
    }
    grouped.get(key)!.push(visit)
  }

  return grouped
}

/**
 * Split payout across calendar months based on visit distribution
 *
 * @param invoicePeriod - Start and end dates of the invoice period
 * @param totalPayout - Total payout amount for the entire period
 * @param visits - Array of visits within this invoice period
 * @param invoicePeriodId - ID of the invoice period for reference
 * @returns Array of monthly payout breakdowns
 *
 * @example
 * ```typescript
 * const period = {
 *   start: new Date('2026-01-06'),
 *   end: new Date('2026-02-05')
 * }
 * const visits = [
 *   { scheduledDate: new Date('2026-01-08') },
 *   { scheduledDate: new Date('2026-01-15') },
 *   { scheduledDate: new Date('2026-01-22') },
 *   { scheduledDate: new Date('2026-02-01') }
 * ]
 * const result = splitPayoutAcrossMonths(period, 1000000, visits, 'inv-123')
 * // Returns:
 * // [
 * //   { month: 1, year: 2026, amount: 750000, visitCount: 3, percentage: 75, invoicePeriodId: 'inv-123' },
 * //   { month: 2, year: 2026, amount: 250000, visitCount: 1, percentage: 25, invoicePeriodId: 'inv-123' }
 * // ]
 * ```
 */
export function splitPayoutAcrossMonths(
  invoicePeriod: { start: Date; end: Date },
  totalPayout: number,
  visits: Visit[],
  invoicePeriodId: string
): MonthlyPayout[] {
  // Edge case: No visits
  if (visits.length === 0) {
    // Return zero payout for the start month
    const startMonthYear = getMonthYearFromDate(invoicePeriod.start)
    return [
      {
        month: startMonthYear.month,
        year: startMonthYear.year,
        amount: 0,
        visitCount: 0,
        percentage: 0,
        invoicePeriodId
      }
    ]
  }

  // Group visits by month
  const visitsByMonth = groupVisitsByMonth(visits)
  const totalVisits = visits.length

  // Calculate payout for each month
  const monthlyPayouts: MonthlyPayout[] = []

  for (const [monthYearKey, monthVisits] of visitsByMonth) {
    const [yearStr, monthStr] = monthYearKey.split('-')
    const year = parseInt(yearStr, 10)
    const month = parseInt(monthStr, 10)

    const visitCount = monthVisits.length
    const percentage = (visitCount / totalVisits) * 100
    const amount = Math.round((visitCount / totalVisits) * totalPayout)

    monthlyPayouts.push({
      month,
      year,
      amount,
      visitCount,
      percentage: Math.round(percentage * 100) / 100, // Round to 2 decimal places
      invoicePeriodId
    })
  }

  // Sort by year and month
  monthlyPayouts.sort((a, b) => {
    if (a.year !== b.year) return a.year - b.year
    return a.month - b.month
  })

  // Adjust for rounding errors - ensure total matches exactly
  const calculatedTotal = monthlyPayouts.reduce((sum, p) => sum + p.amount, 0)
  if (calculatedTotal !== totalPayout && monthlyPayouts.length > 0) {
    const diff = totalPayout - calculatedTotal
    // Add difference to the month with most visits (typically the largest payout)
    const largestPayout = monthlyPayouts.reduce((max, p) =>
      p.visitCount > max.visitCount ? p : max
    )
    largestPayout.amount += diff
  }

  return monthlyPayouts
}

/**
 * Format monthly payout for display
 */
export function formatMonthlyPayout(payout: MonthlyPayout): string {
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]
  const monthName = monthNames[payout.month - 1]
  const amount = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(payout.amount)

  return `${monthName} ${payout.year}: ${amount} (${payout.visitCount} visits, ${payout.percentage}%)`
}

/**
 * Validate that invoice period and visits are consistent
 */
export function validatePeriodVisits(
  invoicePeriod: { start: Date; end: Date },
  visits: Visit[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const periodStart = toJakartaTime(invoicePeriod.start)
  const periodEnd = toJakartaTime(invoicePeriod.end)

  // Check period is valid
  if (periodStart >= periodEnd) {
    errors.push('Invoice period start must be before end')
  }

  // Check all visits are within period
  for (const visit of visits) {
    const visitDate = toJakartaTime(visit.scheduledDate)
    if (visitDate < periodStart || visitDate > periodEnd) {
      errors.push(`Visit on ${visitDate.toISOString()} is outside period ${periodStart.toISOString()} to ${periodEnd.toISOString()}`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
