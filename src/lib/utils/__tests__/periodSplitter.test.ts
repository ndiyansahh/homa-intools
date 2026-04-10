// @ts-nocheck
/**
 * Tests for Period Splitter Utility
 *
 * Test cases based on Image #2 requirements
 */

import {
  splitPayoutAcrossMonths,
  groupVisitsByMonth,
  getMonthYearFromDate,
  formatMonthlyPayout,
  validatePeriodVisits,
  type Visit
} from '../periodSplitter'

describe('periodSplitter', () => {
  describe('getMonthYearFromDate', () => {
    it('should extract month and year correctly', () => {
      const date = new Date('2026-01-15')
      const result = getMonthYearFromDate(date)
      expect(result).toEqual({ month: 1, year: 2026 })
    })

    it('should handle December correctly', () => {
      const date = new Date('2025-12-31')
      const result = getMonthYearFromDate(date)
      expect(result).toEqual({ month: 12, year: 2025 })
    })
  })

  describe('groupVisitsByMonth', () => {
    it('should group visits by calendar month', () => {
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-08') },
        { scheduledDate: new Date('2026-01-15') },
        { scheduledDate: new Date('2026-01-22') },
        { scheduledDate: new Date('2026-02-01') }
      ]

      const grouped = groupVisitsByMonth(visits)
      expect(grouped.size).toBe(2)
      expect(grouped.get('2026-01')?.length).toBe(3)
      expect(grouped.get('2026-02')?.length).toBe(1)
    })

    it('should handle single month period', () => {
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-08') },
        { scheduledDate: new Date('2026-01-15') }
      ]

      const grouped = groupVisitsByMonth(visits)
      expect(grouped.size).toBe(1)
      expect(grouped.get('2026-01')?.length).toBe(2)
    })

    it('should handle three month period', () => {
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-31') },
        { scheduledDate: new Date('2026-02-15') },
        { scheduledDate: new Date('2026-03-01') }
      ]

      const grouped = groupVisitsByMonth(visits)
      expect(grouped.size).toBe(3)
      expect(grouped.get('2026-01')?.length).toBe(1)
      expect(grouped.get('2026-02')?.length).toBe(1)
      expect(grouped.get('2026-03')?.length).toBe(1)
    })
  })

  describe('splitPayoutAcrossMonths', () => {
    it('should split payout correctly for Image #2 example (6-Jan to 5-Feb)', () => {
      const period = {
        start: new Date('2026-01-06'),
        end: new Date('2026-02-05')
      }
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-08') },
        { scheduledDate: new Date('2026-01-15') },
        { scheduledDate: new Date('2026-01-22') },
        { scheduledDate: new Date('2026-02-01') }
      ]
      const totalPayout = 1000000 // 1 million IDR
      const invoicePeriodId = 'inv-123'

      const result = splitPayoutAcrossMonths(period, totalPayout, visits, invoicePeriodId)

      expect(result).toHaveLength(2)

      // January: 3 visits = 75%
      expect(result[0]).toEqual({
        month: 1,
        year: 2026,
        amount: 750000,
        visitCount: 3,
        percentage: 75,
        invoicePeriodId: 'inv-123'
      })

      // February: 1 visit = 25%
      expect(result[1]).toEqual({
        month: 2,
        year: 2026,
        amount: 250000,
        visitCount: 1,
        percentage: 25,
        invoicePeriodId: 'inv-123'
      })

      // Verify total
      const total = result.reduce((sum, p) => sum + p.amount, 0)
      expect(total).toBe(totalPayout)
    })

    it('should handle single month period (100% to one month)', () => {
      const period = {
        start: new Date('2026-01-06'),
        end: new Date('2026-01-25')
      }
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-08') },
        { scheduledDate: new Date('2026-01-15') },
        { scheduledDate: new Date('2026-01-22') }
      ]
      const totalPayout = 900000
      const invoicePeriodId = 'inv-124'

      const result = splitPayoutAcrossMonths(period, totalPayout, visits, invoicePeriodId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        month: 1,
        year: 2026,
        amount: 900000,
        visitCount: 3,
        percentage: 100,
        invoicePeriodId: 'inv-124'
      })
    })

    it('should handle zero visits edge case', () => {
      const period = {
        start: new Date('2026-01-06'),
        end: new Date('2026-02-05')
      }
      const visits: Visit[] = []
      const totalPayout = 1000000
      const invoicePeriodId = 'inv-125'

      const result = splitPayoutAcrossMonths(period, totalPayout, visits, invoicePeriodId)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        month: 1,
        year: 2026,
        amount: 0,
        visitCount: 0,
        percentage: 0,
        invoicePeriodId: 'inv-125'
      })
    })

    it('should handle three month period', () => {
      const period = {
        start: new Date('2026-01-31'),
        end: new Date('2026-03-30')
      }
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-31') }, // Jan: 1 visit
        { scheduledDate: new Date('2026-02-10') }, // Feb: 2 visits
        { scheduledDate: new Date('2026-02-20') },
        { scheduledDate: new Date('2026-03-05') }  // Mar: 1 visit
      ]
      const totalPayout = 800000
      const invoicePeriodId = 'inv-126'

      const result = splitPayoutAcrossMonths(period, totalPayout, visits, invoicePeriodId)

      expect(result).toHaveLength(3)

      // January: 1/4 = 25%
      expect(result[0].month).toBe(1)
      expect(result[0].visitCount).toBe(1)
      expect(result[0].percentage).toBe(25)
      expect(result[0].amount).toBe(200000)

      // February: 2/4 = 50%
      expect(result[1].month).toBe(2)
      expect(result[1].visitCount).toBe(2)
      expect(result[1].percentage).toBe(50)
      expect(result[1].amount).toBe(400000)

      // March: 1/4 = 25%
      expect(result[2].month).toBe(3)
      expect(result[2].visitCount).toBe(1)
      expect(result[2].percentage).toBe(25)
      expect(result[2].amount).toBe(200000)

      // Verify total
      const total = result.reduce((sum, p) => sum + p.amount, 0)
      expect(total).toBe(totalPayout)
    })

    it('should handle rounding errors correctly', () => {
      const period = {
        start: new Date('2026-01-06'),
        end: new Date('2026-02-05')
      }
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-08') },
        { scheduledDate: new Date('2026-01-15') },
        { scheduledDate: new Date('2026-02-01') }
      ]
      const totalPayout = 1000001 // Odd number to force rounding
      const invoicePeriodId = 'inv-127'

      const result = splitPayoutAcrossMonths(period, totalPayout, visits, invoicePeriodId)

      // Verify total matches exactly (no rounding error)
      const total = result.reduce((sum, p) => sum + p.amount, 0)
      expect(total).toBe(totalPayout)
    })
  })

  describe('formatMonthlyPayout', () => {
    it('should format payout correctly', () => {
      const payout = {
        month: 1,
        year: 2026,
        amount: 750000,
        visitCount: 3,
        percentage: 75,
        invoicePeriodId: 'inv-123'
      }

      const formatted = formatMonthlyPayout(payout)
      expect(formatted).toContain('Jan 2026')
      expect(formatted).toContain('750')
      expect(formatted).toContain('3 visits')
      expect(formatted).toContain('75%')
    })
  })

  describe('validatePeriodVisits', () => {
    it('should validate correct period and visits', () => {
      const period = {
        start: new Date('2026-01-06'),
        end: new Date('2026-02-05')
      }
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-08') },
        { scheduledDate: new Date('2026-02-01') }
      ]

      const result = validatePeriodVisits(period, visits)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid period (start >= end)', () => {
      const period = {
        start: new Date('2026-02-05'),
        end: new Date('2026-01-06')
      }
      const visits: Visit[] = []

      const result = validatePeriodVisits(period, visits)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('Invoice period start must be before end')
    })

    it('should detect visits outside period', () => {
      const period = {
        start: new Date('2026-01-06'),
        end: new Date('2026-02-05')
      }
      const visits: Visit[] = [
        { scheduledDate: new Date('2026-01-05') }, // Before start
        { scheduledDate: new Date('2026-02-06') }  // After end
      ]

      const result = validatePeriodVisits(period, visits)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
