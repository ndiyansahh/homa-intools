/**
 * Normal Range Configuration for Package Visit Frequencies
 *
 * Based on Image #1 requirements:
 * - 1x/week = 4-5 visits/month
 * - 2x/week = 8-9 visits/month
 * - 3x/week = 12-13 visits/month
 * - 4x/week = 16-18 visits/month
 * - 5x/week = 20-22 visits/month
 * - 6x/week = 24-27 visits/month
 * - 7x/week = 28-31 visits/month
 *
 * If actual visits fall within normal range = 100% payout rate
 */

/**
 * Normal range configuration (min-max visits per month)
 * Key: visits per week (1-7)
 * Value: { min, max } visits per month
 */
export const NORMAL_RANGES: Record<number, { min: number; max: number }> = {
  1: { min: 4, max: 5 },
  2: { min: 8, max: 9 },
  3: { min: 12, max: 13 },
  4: { min: 16, max: 18 },
  5: { min: 20, max: 22 },
  6: { min: 24, max: 27 },
  7: { min: 28, max: 31 },
} as const

/**
 * Get normal range (min/max visits) for a package type
 *
 * @param visitsPerWeek - Number of scheduled visits per week (1-7)
 * @returns Object with min and max visits per month
 * @throws Error if visitsPerWeek is invalid
 *
 * @example
 * ```typescript
 * // 1x/week package
 * getNormalRange(1) // { min: 4, max: 5 }
 *
 * // 3x/week package
 * getNormalRange(3) // { min: 12, max: 13 }
 *
 * // 7x/week package (daily)
 * getNormalRange(7) // { min: 28, max: 31 }
 * ```
 */
export function getNormalRange(visitsPerWeek: number): { min: number; max: number } {
  // Validate input
  if (!Number.isInteger(visitsPerWeek) || visitsPerWeek < 1 || visitsPerWeek > 7) {
    throw new Error(`Invalid visitsPerWeek: ${visitsPerWeek}. Must be an integer between 1 and 7.`)
  }

  return NORMAL_RANGES[visitsPerWeek]
}

/**
 * Check if actual visits fall within normal range
 *
 * @param actualVisits - Number of visits completed in a month
 * @param visitsPerWeek - Package frequency (1-7 visits per week)
 * @returns true if within range, false otherwise
 *
 * @example
 * ```typescript
 * // 1x/week package, 4 visits completed
 * isWithinNormalRange(4, 1) // true (4 is within 4-5 range)
 *
 * // 2x/week package, 7 visits completed
 * isWithinNormalRange(7, 2) // false (7 is below 8-9 range)
 *
 * // 3x/week package, 12 visits completed
 * isWithinNormalRange(12, 3) // true (12 is within 12-13 range)
 * ```
 */
export function isWithinNormalRange(actualVisits: number, visitsPerWeek: number): boolean {
  const { min, max } = getNormalRange(visitsPerWeek)
  return actualVisits >= min && actualVisits <= max
}

/**
 * Get all valid visits per week options
 * Useful for UI dropdowns/validation
 *
 * @returns Array of valid visits per week [1, 2, 3, 4, 5, 6, 7]
 */
export function getValidVisitsPerWeek(): number[] {
  return Object.keys(NORMAL_RANGES).map(Number)
}

/**
 * Format normal range as human-readable string
 *
 * @param visitsPerWeek - Package frequency (1-7 visits per week)
 * @returns Formatted string like "4-5 visits/month"
 *
 * @example
 * ```typescript
 * formatNormalRange(1) // "4-5 visits/month"
 * formatNormalRange(3) // "12-13 visits/month"
 * formatNormalRange(7) // "28-31 visits/month"
 * ```
 */
export function formatNormalRange(visitsPerWeek: number): string {
  const { min, max } = getNormalRange(visitsPerWeek)
  return `${min}-${max} visits/month`
}

/**
 * Type-safe normal range result
 */
export type NormalRange = {
  min: number
  max: number
}

/**
 * Example usage in payout calculation:
 *
 * ```typescript
 * import { getNormalRange, isWithinNormalRange } from '@/lib/utils/normalRange'
 *
 * function calculatePayout(
 *   actualVisits: number,
 *   scheduledVisitsPerWeek: number,
 *   monthlyRate: number
 * ): number {
 *   const { min: normalMin, max: normalMax } = getNormalRange(scheduledVisitsPerWeek)
 *
 *   // If within normal range, pay 100% of monthly rate
 *   if (isWithinNormalRange(actualVisits, scheduledVisitsPerWeek)) {
 *     return monthlyRate
 *   }
 *
 *   // Otherwise, pro-rate based on actual performance
 *   // (handled by other agent)
 *   return calculateProRatePayout(actualVisits, normalMax, monthlyRate)
 * }
 * ```
 */
