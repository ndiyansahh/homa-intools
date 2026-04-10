// @ts-nocheck
/**
 * Bonus Calculator Test Suite
 * Verifies bonus calculation formulas match Image #1 requirements
 */

import { calculatePayoutPercentage, calculatePayoutAmount, calculatePayoutBreakdown } from '../bonusCalculator'

describe('Bonus Calculator', () => {
  describe('calculatePayoutPercentage', () => {
    it('should return 0% for no visits', () => {
      expect(calculatePayoutPercentage(2, 0)).toBe(0)
      expect(calculatePayoutPercentage(1, 0)).toBe(0)
      expect(calculatePayoutPercentage(7, 0)).toBe(0)
    })

    it('should calculate pro-rata for visits below normal range', () => {
      // 1x/week, 3 visits (normal: 4-5) → 3/4 × 100% = 75%
      expect(calculatePayoutPercentage(1, 3)).toBe(75)

      // 2x/week, 7 visits (normal: 8-9) → 7/8 × 100% = 87.5%
      expect(calculatePayoutPercentage(2, 7)).toBe(87.5)

      // 3x/week, 10 visits (normal: 12-13) → 10/12 × 100% = 83.33%
      expect(calculatePayoutPercentage(3, 10)).toBe(83.33)
    })

    it('should return 100% for visits within normal range', () => {
      // 1x/week normal range: 4-5
      expect(calculatePayoutPercentage(1, 4)).toBe(100)
      expect(calculatePayoutPercentage(1, 5)).toBe(100)

      // 2x/week normal range: 8-9
      expect(calculatePayoutPercentage(2, 8)).toBe(100)
      expect(calculatePayoutPercentage(2, 9)).toBe(100)

      // 3x/week normal range: 12-13
      expect(calculatePayoutPercentage(3, 12)).toBe(100)
      expect(calculatePayoutPercentage(3, 13)).toBe(100)

      // 7x/week normal range: 28-31
      expect(calculatePayoutPercentage(7, 28)).toBe(100)
      expect(calculatePayoutPercentage(7, 31)).toBe(100)
    })

    it('should calculate bonus for visits above normal range', () => {
      // 1x/week, 6 visits (1 extra) → 100% + 1/5 × 100% = 120%
      expect(calculatePayoutPercentage(1, 6)).toBe(120)

      // 1x/week, 7 visits (2 extra) → 100% + 2/5 × 100% = 140%
      expect(calculatePayoutPercentage(1, 7)).toBe(140)

      // 2x/week, 10 visits (1 extra) → 100% + 1/9 × 100% = 111.11%
      expect(calculatePayoutPercentage(2, 10)).toBe(111.11)

      // 2x/week, 11 visits (2 extra) → 100% + 2/9 × 100% = 122.22%
      expect(calculatePayoutPercentage(2, 11)).toBe(122.22)

      // 3x/week, 14 visits (1 extra) → 100% + 1/13 × 100% = 107.69%
      expect(calculatePayoutPercentage(3, 14)).toBe(107.69)

      // 3x/week, 15 visits (2 extra) → 100% + 2/13 × 100% = 115.38%
      expect(calculatePayoutPercentage(3, 15)).toBe(115.38)
    })

    it('should handle all frequency types correctly', () => {
      // 4x/week, 19 visits (1 extra) → 100% + 1/18 × 100% = 105.56%
      expect(calculatePayoutPercentage(4, 19)).toBe(105.56)

      // 5x/week, 23 visits (1 extra) → 100% + 1/22 × 100% = 104.55%
      expect(calculatePayoutPercentage(5, 23)).toBe(104.55)

      // 6x/week, 28 visits (1 extra) → 100% + 1/27 × 100% = 103.70%
      expect(calculatePayoutPercentage(6, 28)).toBe(103.7)

      // 7x/week, 32 visits (1 extra) → 100% + 1/31 × 100% = 103.23%
      expect(calculatePayoutPercentage(7, 32)).toBe(103.23)
    })
  })

  describe('calculatePayoutAmount', () => {
    it('should calculate correct payout amount from percentage', () => {
      // Rp 900,000 × 111.11% = Rp 1,000,000
      expect(calculatePayoutAmount(900000, 111.11)).toBe(1000000)

      // Rp 500,000 × 75% = Rp 375,000
      expect(calculatePayoutAmount(500000, 75)).toBe(375000)

      // Rp 1,200,000 × 100% = Rp 1,200,000
      expect(calculatePayoutAmount(1200000, 100)).toBe(1200000)

      // Rp 800,000 × 120% = Rp 960,000
      expect(calculatePayoutAmount(800000, 120)).toBe(960000)
    })

    it('should round to nearest Rupiah', () => {
      // Test rounding
      expect(calculatePayoutAmount(900000, 111.11)).toBe(1000000) // Rounds 999,990 to 1,000,000
      expect(calculatePayoutAmount(1000000, 107.69)).toBe(1076900)
    })
  })

  describe('calculatePayoutBreakdown', () => {
    it('should break down payout with no visits', () => {
      const result = calculatePayoutBreakdown(2, 0, 900000)

      expect(result).toEqual({
        percentage: 0,
        basePayout: 0,
        bonusPayout: 0,
        totalPayout: 0,
        extraVisits: 0,
        normalRange: { min: 8, max: 9 },
        scenario: 'NO_VISITS',
      })
    })

    it('should break down payout below normal range', () => {
      // 2x/week, 7 visits (below 8-9 range)
      const result = calculatePayoutBreakdown(2, 7, 900000)

      expect(result).toEqual({
        percentage: 87.5,
        basePayout: 787500, // 900,000 × 87.5%
        bonusPayout: 0,
        totalPayout: 787500,
        extraVisits: 0,
        normalRange: { min: 8, max: 9 },
        scenario: 'BELOW_RANGE',
      })
    })

    it('should break down payout within normal range', () => {
      // 3x/week, 12 visits (within 12-13 range)
      const result = calculatePayoutBreakdown(3, 12, 1200000)

      expect(result).toEqual({
        percentage: 100,
        basePayout: 1200000,
        bonusPayout: 0,
        totalPayout: 1200000,
        extraVisits: 0,
        normalRange: { min: 12, max: 13 },
        scenario: 'WITHIN_RANGE',
      })
    })

    it('should break down payout with bonus (above normal range)', () => {
      // 2x/week, 10 visits (1 extra)
      const result = calculatePayoutBreakdown(2, 10, 900000)

      expect(result.percentage).toBe(111.11)
      expect(result.basePayout).toBe(900000)
      expect(result.bonusPayout).toBe(100000)
      expect(result.totalPayout).toBe(1000000)
      expect(result.extraVisits).toBe(1)
      expect(result.normalRange).toEqual({ min: 8, max: 9 })
      expect(result.scenario).toBe('ABOVE_RANGE')
    })

    it('should handle multiple extra visits correctly', () => {
      // 1x/week, 7 visits (2 extra) → 140%
      const result = calculatePayoutBreakdown(1, 7, 500000)

      expect(result.percentage).toBe(140)
      expect(result.basePayout).toBe(500000)
      expect(result.bonusPayout).toBe(200000) // 500,000 × 40%
      expect(result.totalPayout).toBe(700000)
      expect(result.extraVisits).toBe(2)
      expect(result.scenario).toBe('ABOVE_RANGE')
    })
  })

  describe('Edge Cases', () => {
    it('should handle edge case: exactly at minimum', () => {
      expect(calculatePayoutPercentage(1, 4)).toBe(100)
      expect(calculatePayoutPercentage(2, 8)).toBe(100)
      expect(calculatePayoutPercentage(7, 28)).toBe(100)
    })

    it('should handle edge case: exactly at maximum', () => {
      expect(calculatePayoutPercentage(1, 5)).toBe(100)
      expect(calculatePayoutPercentage(2, 9)).toBe(100)
      expect(calculatePayoutPercentage(7, 31)).toBe(100)
    })

    it('should handle edge case: 1 visit above maximum', () => {
      // Just 1 visit over should trigger bonus
      expect(calculatePayoutPercentage(1, 6)).toBe(120)
      expect(calculatePayoutPercentage(2, 10)).toBe(111.11)
      expect(calculatePayoutPercentage(7, 32)).toBe(103.23)
    })

    it('should handle very high bonus scenarios', () => {
      // 1x/week with 10 visits (5 extra) → 100% + 5/5 × 100% = 200%
      expect(calculatePayoutPercentage(1, 10)).toBe(200)

      // Verify payout amount
      const amount = calculatePayoutAmount(500000, 200)
      expect(amount).toBe(1000000) // Double the base rate
    })
  })
})
