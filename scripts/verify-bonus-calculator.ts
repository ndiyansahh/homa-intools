/**
 * Manual verification script for bonus calculator
 * Run: npx tsx scripts/verify-bonus-calculator.ts
 */

import { calculatePayoutPercentage, calculatePayoutAmount, calculatePayoutBreakdown } from '../src/lib/utils/bonusCalculator'

console.log('🧪 BONUS CALCULATOR VERIFICATION\n')
console.log('=' .repeat(60))

// TEST CASE 1: No visits
console.log('\n📌 TEST CASE 1: No visits')
console.log('calculatePayoutPercentage(2, 0)')
console.log('Expected: 0%')
console.log('Actual:', calculatePayoutPercentage(2, 0) + '%')

// TEST CASE 2: Below normal range
console.log('\n📌 TEST CASE 2: Below normal range (pro-rata)')
console.log('\n2a. 1x/week, 3 visits (normal: 4-5)')
console.log('Formula: 3/4 × 100% = 75%')
console.log('Actual:', calculatePayoutPercentage(1, 3) + '%')

console.log('\n2b. 2x/week, 7 visits (normal: 8-9)')
console.log('Formula: 7/8 × 100% = 87.5%')
console.log('Actual:', calculatePayoutPercentage(2, 7) + '%')

console.log('\n2c. 3x/week, 10 visits (normal: 12-13)')
console.log('Formula: 10/12 × 100% = 83.33%')
console.log('Actual:', calculatePayoutPercentage(3, 10) + '%')

// TEST CASE 3: Within normal range
console.log('\n📌 TEST CASE 3: Within normal range (100%)')
console.log('\n3a. 1x/week, 4 visits → 100%')
console.log('Actual:', calculatePayoutPercentage(1, 4) + '%')

console.log('\n3b. 2x/week, 8 visits → 100%')
console.log('Actual:', calculatePayoutPercentage(2, 8) + '%')

console.log('\n3c. 2x/week, 9 visits → 100%')
console.log('Actual:', calculatePayoutPercentage(2, 9) + '%')

console.log('\n3d. 3x/week, 13 visits → 100%')
console.log('Actual:', calculatePayoutPercentage(3, 13) + '%')

// TEST CASE 4: Above normal range (BONUS)
console.log('\n📌 TEST CASE 4: Above normal range (BONUS) ⭐')
console.log('\n4a. 1x/week, 6 visits (1 extra)')
console.log('Formula: 100% + (1/5 × 100%) = 120%')
console.log('Actual:', calculatePayoutPercentage(1, 6) + '%')

console.log('\n4b. 1x/week, 7 visits (2 extra)')
console.log('Formula: 100% + (2/5 × 100%) = 140%')
console.log('Actual:', calculatePayoutPercentage(1, 7) + '%')

console.log('\n4c. 2x/week, 10 visits (1 extra) ← Image #1 Example')
console.log('Formula: 100% + (1/9 × 100%) = 111.11%')
console.log('Actual:', calculatePayoutPercentage(2, 10) + '%')

console.log('\n4d. 2x/week, 11 visits (2 extra)')
console.log('Formula: 100% + (2/9 × 100%) = 122.22%')
console.log('Actual:', calculatePayoutPercentage(2, 11) + '%')

console.log('\n4e. 3x/week, 14 visits (1 extra) ← Image #1 Example')
console.log('Formula: 100% + (1/13 × 100%) = 107.69%')
console.log('Actual:', calculatePayoutPercentage(3, 14) + '%')

console.log('\n4f. 3x/week, 15 visits (2 extra)')
console.log('Formula: 100% + (2/13 × 100%) = 115.38%')
console.log('Actual:', calculatePayoutPercentage(3, 15) + '%')

// TEST CASE 5: Payout amount calculation
console.log('\n📌 TEST CASE 5: Payout amount calculation')
console.log('\n5a. Rp 900,000 × 111.11%')
console.log('Expected: Rp 1,000,000')
console.log('Actual: Rp', calculatePayoutAmount(900000, 111.11).toLocaleString('id-ID'))

console.log('\n5b. Rp 500,000 × 75%')
console.log('Expected: Rp 375,000')
console.log('Actual: Rp', calculatePayoutAmount(500000, 75).toLocaleString('id-ID'))

console.log('\n5c. Rp 800,000 × 120%')
console.log('Expected: Rp 960,000')
console.log('Actual: Rp', calculatePayoutAmount(800000, 120).toLocaleString('id-ID'))

// TEST CASE 6: Full breakdown
console.log('\n📌 TEST CASE 6: Full breakdown with bonus')
console.log('\nScenario: 2x/week, 10 visits, Rp 900,000/month')
const breakdown = calculatePayoutBreakdown(2, 10, 900000)
console.log('Result:')
console.log('  Percentage:', breakdown.percentage + '%')
console.log('  Base Payout: Rp', breakdown.basePayout.toLocaleString('id-ID'))
console.log('  Bonus Payout: Rp', breakdown.bonusPayout.toLocaleString('id-ID'))
console.log('  Total Payout: Rp', breakdown.totalPayout.toLocaleString('id-ID'))
console.log('  Extra Visits:', breakdown.extraVisits)
console.log('  Normal Range:', breakdown.normalRange.min + '-' + breakdown.normalRange.max)
console.log('  Scenario:', breakdown.scenario)

// TEST CASE 7: All frequency types
console.log('\n📌 TEST CASE 7: All frequency types (1 extra visit each)')
for (let frequency = 1; frequency <= 7; frequency++) {
  const normalRange = require('../src/lib/utils/normalRange').getNormalRange(frequency)
  const extraVisit = normalRange.max + 1
  const percentage = calculatePayoutPercentage(frequency, extraVisit)
  console.log(`${frequency}x/week, ${extraVisit} visits → ${percentage}%`)
}

// TEST CASE 8: Edge case - very high bonus
console.log('\n📌 TEST CASE 8: Edge case - 1x/week with 10 visits (5 extra)')
console.log('Formula: 100% + (5/5 × 100%) = 200%')
const extremePercentage = calculatePayoutPercentage(1, 10)
console.log('Actual:', extremePercentage + '%')
console.log('Payout for Rp 500,000: Rp', calculatePayoutAmount(500000, extremePercentage).toLocaleString('id-ID'))

console.log('\n' + '='.repeat(60))
console.log('✅ ALL VERIFICATIONS COMPLETE\n')
