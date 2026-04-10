/**
 * Bonus Calculation for Visits Exceeding Normal Range
 *
 * Based on Image #1 requirements:
 * When a mitra completes MORE visits than the maximum normal range,
 * they receive bonus payout on top of their 100% base rate.
 *
 * Formula:
 * Total Payout = Normal Range (100%) + (num additional visits / max normal range × 100%)
 *
 * Examples:
 * - 2x/week (9 visits max) + 1 extra visit = 100% + (1/9 × 100%) = 111.11%
 * - 3x/week (13 visits max) + 1 extra visit = 100% + (1/13 × 100%) = 107.69%
 * - 1x/week (5 visits max) + 2 extra visits = 100% + (2/5 × 100%) = 140%
 */

import { getNormalRange } from './normalRange'

/**
 * Calculate total payout percentage based on actual visits vs normal range
 *
 * Logic:
 * 1. If actualVisits = 0 → return 0%
 * 2. If actualVisits < min normal range → pro-rata percentage
 * 3. If actualVisits within normal range → return 100%
 * 4. If actualVisits > max normal range → return 100% + bonus percentage
 *
 * @param visitsPerWeek - Package frequency (1-7 visits per week)
 * @param actualVisits - Number of visits completed in the month
 * @returns Total payout percentage (e.g., 111.11, 87.5, 100)
 *
 * @example
 * ```typescript
 * // Case 1: No visits completed
 * calculatePayoutPercentage(2, 0)
 * // Returns: 0
 *
 * // Case 2: Below normal range (pro-rata)
 * calculatePayoutPercentage(2, 7)  // 2x/week, only 7 visits (normal: 8-9)
 * // Returns: 87.5 (7/8 × 100%)
 *
 * // Case 3: Within normal range (full pay)
 * calculatePayoutPercentage(2, 8)  // 2x/week, 8 visits (within 8-9)
 * // Returns: 100
 *
 * calculatePayoutPercentage(2, 9)  // 2x/week, 9 visits (within 8-9)
 * // Returns: 100
 *
 * // Case 4: Above normal range (bonus)
 * calculatePayoutPercentage(2, 10) // 2x/week, 10 visits (1 extra)
 * // Returns: 111.11 (100% + 1/9 × 100%)
 *
 * calculatePayoutPercentage(3, 14) // 3x/week, 14 visits (1 extra)
 * // Returns: 107.69 (100% + 1/13 × 100%)
 *
 * calculatePayoutPercentage(1, 7)  // 1x/week, 7 visits (2 extra)
 * // Returns: 140 (100% + 2/5 × 100%)
 * ```
 */
export function calculatePayoutPercentage(
  visitsPerWeek: number,
  actualVisits: number
): number {
  // Edge case: No visits completed
  if (actualVisits === 0) {
    return 0
  }

  // Get normal range for this package type
  const { min: normalMin, max: normalMax } = getNormalRange(visitsPerWeek)

  // Case 1: Below minimum normal range → Pro-rata
  if (actualVisits < normalMin) {
    // Pro-rata based on minimum normal range
    // Example: 2x/week (min 8), 7 visits → 7/8 × 100% = 87.5%
    const percentage = (actualVisits / normalMin) * 100
    return Math.round(percentage * 100) / 100 // Round to 2 decimal places
  }

  // Case 2: Within normal range → 100%
  if (actualVisits >= normalMin && actualVisits <= normalMax) {
    return 100
  }

  // Case 3: Above maximum normal range → 100% + bonus
  const extraVisits = actualVisits - normalMax
  const bonusPercentage = (extraVisits / normalMax) * 100

  // Total = 100% + bonus
  const totalPercentage = 100 + bonusPercentage

  return Math.round(totalPercentage * 100) / 100 // Round to 2 decimal places
}

/**
 * Calculate actual payout amount based on percentage
 *
 * @param monthlyRate - Base monthly rate for the customer
 * @param payoutPercentage - Percentage from calculatePayoutPercentage()
 * @returns Actual payout amount in Rupiah
 *
 * @example
 * ```typescript
 * // 2x/week package, monthly rate: Rp 900,000
 * const percentage = calculatePayoutPercentage(2, 10) // 111.11%
 * const payout = calculatePayoutAmount(900000, percentage)
 * // Returns: 1,000,000 (Rp 900,000 × 111.11%)
 *
 * // 1x/week package, monthly rate: Rp 500,000
 * const percentage = calculatePayoutPercentage(1, 3) // 75% (3/4 × 100%)
 * const payout = calculatePayoutAmount(500000, percentage)
 * // Returns: 375,000 (Rp 500,000 × 75%)
 * ```
 */
export function calculatePayoutAmount(
  monthlyRate: number,
  payoutPercentage: number
): number {
  const amount = (monthlyRate * payoutPercentage) / 100
  return Math.round(amount) // Round to nearest Rupiah
}

/**
 * Calculate breakdown showing base + bonus separately
 *
 * Useful for detailed payout reports showing:
 * - Base payout (100% of monthly rate)
 * - Bonus payout (extra percentage)
 * - Total payout
 *
 * @param visitsPerWeek - Package frequency (1-7 visits per week)
 * @param actualVisits - Number of visits completed
 * @param monthlyRate - Base monthly rate
 * @returns Object with base, bonus, and total amounts
 *
 * @example
 * ```typescript
 * // 2x/week, 10 visits, Rp 900,000/month
 * const breakdown = calculatePayoutBreakdown(2, 10, 900000)
 * // Returns:
 * // {
 * //   percentage: 111.11,
 * //   basePayout: 900000,      // 100% of rate
 * //   bonusPayout: 100000,     // 11.11% of rate
 * //   totalPayout: 1000000,    // base + bonus
 * //   extraVisits: 1,
 * //   normalRange: { min: 8, max: 9 }
 * // }
 *
 * // 3x/week, 12 visits (within range), Rp 1,200,000/month
 * const breakdown = calculatePayoutBreakdown(3, 12, 1200000)
 * // Returns:
 * // {
 * //   percentage: 100,
 * //   basePayout: 1200000,
 * //   bonusPayout: 0,
 * //   totalPayout: 1200000,
 * //   extraVisits: 0,
 * //   normalRange: { min: 12, max: 13 }
 * // }
 * ```
 */
export function calculatePayoutBreakdown(
  visitsPerWeek: number,
  actualVisits: number,
  monthlyRate: number
): {
  percentage: number
  basePayout: number
  bonusPayout: number
  totalPayout: number
  extraVisits: number
  normalRange: { min: number; max: number }
  scenario: 'NO_VISITS' | 'BELOW_RANGE' | 'WITHIN_RANGE' | 'ABOVE_RANGE'
} {
  const normalRange = getNormalRange(visitsPerWeek)
  const percentage = calculatePayoutPercentage(visitsPerWeek, actualVisits)

  // Determine scenario
  let scenario: 'NO_VISITS' | 'BELOW_RANGE' | 'WITHIN_RANGE' | 'ABOVE_RANGE'
  let basePayout: number
  let bonusPayout: number
  let extraVisits: number

  if (actualVisits === 0) {
    scenario = 'NO_VISITS'
    basePayout = 0
    bonusPayout = 0
    extraVisits = 0
  } else if (actualVisits < normalRange.min) {
    scenario = 'BELOW_RANGE'
    basePayout = calculatePayoutAmount(monthlyRate, percentage)
    bonusPayout = 0
    extraVisits = 0
  } else if (actualVisits <= normalRange.max) {
    scenario = 'WITHIN_RANGE'
    basePayout = monthlyRate
    bonusPayout = 0
    extraVisits = 0
  } else {
    scenario = 'ABOVE_RANGE'
    basePayout = monthlyRate
    extraVisits = actualVisits - normalRange.max
    bonusPayout = calculatePayoutAmount(monthlyRate, percentage) - monthlyRate
  }

  const totalPayout = basePayout + bonusPayout

  return {
    percentage,
    basePayout: Math.round(basePayout),
    bonusPayout: Math.round(bonusPayout),
    totalPayout: Math.round(totalPayout),
    extraVisits,
    normalRange,
    scenario,
  }
}

/**
 * Type-safe payout breakdown result
 */
export type PayoutBreakdown = ReturnType<typeof calculatePayoutBreakdown>

/**
 * COMPREHENSIVE TEST EXAMPLES
 * Run these in your tests to verify correctness
 */

/*
TEST CASE 1: No visits
calculatePayoutPercentage(2, 0)
Expected: 0%

TEST CASE 2: Below normal range (pro-rata)
calculatePayoutPercentage(1, 3)  // 1x/week, 3 visits (normal: 4-5)
Expected: 75% (3/4 × 100%)

calculatePayoutPercentage(2, 7)  // 2x/week, 7 visits (normal: 8-9)
Expected: 87.5% (7/8 × 100%)

calculatePayoutPercentage(3, 10) // 3x/week, 10 visits (normal: 12-13)
Expected: 83.33% (10/12 × 100%)

TEST CASE 3: Within normal range (100%)
calculatePayoutPercentage(1, 4)  // 1x/week, 4 visits
Expected: 100%

calculatePayoutPercentage(1, 5)  // 1x/week, 5 visits
Expected: 100%

calculatePayoutPercentage(2, 8)  // 2x/week, 8 visits
Expected: 100%

calculatePayoutPercentage(2, 9)  // 2x/week, 9 visits
Expected: 100%

calculatePayoutPercentage(3, 12) // 3x/week, 12 visits
Expected: 100%

calculatePayoutPercentage(3, 13) // 3x/week, 13 visits
Expected: 100%

TEST CASE 4: Above normal range (bonus)
calculatePayoutPercentage(1, 6)  // 1x/week, 6 visits (1 extra)
Expected: 120% (100% + 1/5 × 100%)

calculatePayoutPercentage(1, 7)  // 1x/week, 7 visits (2 extra)
Expected: 140% (100% + 2/5 × 100%)

calculatePayoutPercentage(2, 10) // 2x/week, 10 visits (1 extra)
Expected: 111.11% (100% + 1/9 × 100%)

calculatePayoutPercentage(2, 11) // 2x/week, 11 visits (2 extra)
Expected: 122.22% (100% + 2/9 × 100%)

calculatePayoutPercentage(3, 14) // 3x/week, 14 visits (1 extra)
Expected: 107.69% (100% + 1/13 × 100%)

calculatePayoutPercentage(3, 15) // 3x/week, 15 visits (2 extra)
Expected: 115.38% (100% + 2/13 × 100%)

calculatePayoutPercentage(4, 19) // 4x/week, 19 visits (1 extra)
Expected: 105.56% (100% + 1/18 × 100%)

calculatePayoutPercentage(5, 23) // 5x/week, 23 visits (1 extra)
Expected: 104.55% (100% + 1/22 × 100%)

calculatePayoutPercentage(6, 28) // 6x/week, 28 visits (1 extra)
Expected: 103.70% (100% + 1/27 × 100%)

calculatePayoutPercentage(7, 32) // 7x/week, 32 visits (1 extra)
Expected: 103.23% (100% + 1/31 × 100%)

TEST CASE 5: Payout amount calculation
monthlyRate = 900,000 (Rp)
percentage = 111.11%
calculatePayoutAmount(900000, 111.11)
Expected: 1,000,000 (rounded)

TEST CASE 6: Breakdown with bonus
calculatePayoutBreakdown(2, 10, 900000)
Expected:
{
  percentage: 111.11,
  basePayout: 900000,
  bonusPayout: 100000,
  totalPayout: 1000000,
  extraVisits: 1,
  normalRange: { min: 8, max: 9 },
  scenario: 'ABOVE_RANGE'
}
*/
