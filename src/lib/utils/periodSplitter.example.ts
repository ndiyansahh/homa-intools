/**
 * Usage Examples for Period Splitter
 *
 * This file demonstrates how to use the period splitter utility
 * in the HOMA application for payout calculations.
 */

import {
  splitPayoutAcrossMonths,
  formatMonthlyPayout,
  validatePeriodVisits,
  type Visit,
  type MonthlyPayout
} from './periodSplitter'

// ============================================================================
// EXAMPLE 1: Basic usage with Image #2 scenario
// ============================================================================

export function example1_BasicSplit() {
  console.log('=== Example 1: Basic Period Split (6-Jan to 5-Feb) ===\n')

  // Invoice period from Image #2
  const invoicePeriod = {
    start: new Date('2026-01-06'),
    end: new Date('2026-02-05')
  }

  // 4 visits: 3 in January, 1 in February
  const visits: Visit[] = [
    { scheduledDate: new Date('2026-01-08') },
    { scheduledDate: new Date('2026-01-15') },
    { scheduledDate: new Date('2026-01-22') },
    { scheduledDate: new Date('2026-02-01') }
  ]

  const totalPayout = 1_200_000 // Rp 1,200,000
  const invoicePeriodId = 'INV-2026-001'

  // Split the payout
  const monthlyPayouts = splitPayoutAcrossMonths(
    invoicePeriod,
    totalPayout,
    visits,
    invoicePeriodId
  )

  // Display results
  console.log('Total Payout:', totalPayout.toLocaleString('id-ID'))
  console.log('Total Visits:', visits.length)
  console.log('\nMonthly Breakdown:')
  monthlyPayouts.forEach(payout => {
    console.log(`  ${formatMonthlyPayout(payout)}`)
  })

  // Expected output:
  // Jan 2026: Rp900,000 (3 visits, 75%)
  // Feb 2026: Rp300,000 (1 visit, 25%)

  return monthlyPayouts
}

// ============================================================================
// EXAMPLE 2: Integration with payout calculation
// ============================================================================

export function example2_PayoutCalculation() {
  console.log('\n=== Example 2: Full Payout Calculation Flow ===\n')

  // Simulate customer data
  const customer = {
    id: 'CUST-001',
    name: 'PT Example Company',
    package: {
      visitsPerWeek: 1,
      monthlyRate: 1_200_000
    }
  }

  // Invoice period (30 days)
  const invoicePeriod = {
    id: 'INV-2026-001',
    start: new Date('2026-01-06'),
    end: new Date('2026-02-05'),
    scheduledVisits: 4
  }

  // Actual visits (mitra completed 4 out of 4)
  const actualVisits: Visit[] = [
    { scheduledDate: new Date('2026-01-08') },
    { scheduledDate: new Date('2026-01-15') },
    { scheduledDate: new Date('2026-01-22') },
    { scheduledDate: new Date('2026-02-01') }
  ]

  // Step 1: Validate visits
  const validation = validatePeriodVisits(invoicePeriod, actualVisits)
  if (!validation.valid) {
    console.error('Validation errors:', validation.errors)
    return null
  }

  // Step 2: Calculate total payout using pro-rate formula
  const totalPayout = Math.round(
    (actualVisits.length / invoicePeriod.scheduledVisits) *
      customer.package.monthlyRate
  )

  console.log('Calculation:')
  console.log(`  Actual visits: ${actualVisits.length}`)
  console.log(`  Scheduled visits: ${invoicePeriod.scheduledVisits}`)
  console.log(`  Monthly rate: Rp${customer.package.monthlyRate.toLocaleString('id-ID')}`)
  console.log(`  Pro-rate: ${actualVisits.length}/${invoicePeriod.scheduledVisits} = ${(actualVisits.length / invoicePeriod.scheduledVisits * 100)}%`)
  console.log(`  Total payout: Rp${totalPayout.toLocaleString('id-ID')}`)

  // Step 3: Split across months
  const monthlyPayouts = splitPayoutAcrossMonths(
    invoicePeriod,
    totalPayout,
    actualVisits,
    invoicePeriod.id
  )

  console.log('\nMonthly Split:')
  monthlyPayouts.forEach(payout => {
    console.log(`  ${formatMonthlyPayout(payout)}`)
  })

  return {
    totalPayout,
    monthlyPayouts
  }
}

// ============================================================================
// EXAMPLE 3: Edge case - Single month period
// ============================================================================

export function example3_SingleMonth() {
  console.log('\n=== Example 3: Single Month Period ===\n')

  const invoicePeriod = {
    start: new Date('2026-01-06'),
    end: new Date('2026-01-31')
  }

  const visits: Visit[] = [
    { scheduledDate: new Date('2026-01-08') },
    { scheduledDate: new Date('2026-01-15') },
    { scheduledDate: new Date('2026-01-22') },
    { scheduledDate: new Date('2026-01-29') }
  ]

  const totalPayout = 1_200_000
  const invoicePeriodId = 'INV-2026-002'

  const monthlyPayouts = splitPayoutAcrossMonths(
    invoicePeriod,
    totalPayout,
    visits,
    invoicePeriodId
  )

  console.log('Period: 6-Jan to 31-Jan (all in January)')
  console.log('Result: 100% to January\n')
  monthlyPayouts.forEach(payout => {
    console.log(`  ${formatMonthlyPayout(payout)}`)
  })

  return monthlyPayouts
}

// ============================================================================
// EXAMPLE 4: Edge case - Three month period
// ============================================================================

export function example4_ThreeMonths() {
  console.log('\n=== Example 4: Three Month Period ===\n')

  const invoicePeriod = {
    start: new Date('2026-01-31'),
    end: new Date('2026-03-30')
  }

  const visits: Visit[] = [
    { scheduledDate: new Date('2026-01-31') }, // Jan: 1
    { scheduledDate: new Date('2026-02-07') }, // Feb: 4
    { scheduledDate: new Date('2026-02-14') },
    { scheduledDate: new Date('2026-02-21') },
    { scheduledDate: new Date('2026-02-28') },
    { scheduledDate: new Date('2026-03-07') }, // Mar: 3
    { scheduledDate: new Date('2026-03-14') },
    { scheduledDate: new Date('2026-03-21') }
  ]

  const totalPayout = 2_400_000
  const invoicePeriodId = 'INV-2026-003'

  const monthlyPayouts = splitPayoutAcrossMonths(
    invoicePeriod,
    totalPayout,
    visits,
    invoicePeriodId
  )

  console.log('Period: 31-Jan to 30-Mar (spans 3 months)')
  console.log('Total visits:', visits.length)
  console.log('\nMonthly Split:')
  monthlyPayouts.forEach(payout => {
    console.log(`  ${formatMonthlyPayout(payout)}`)
  })

  return monthlyPayouts
}

// ============================================================================
// EXAMPLE 5: Database integration pattern
// ============================================================================

export interface DatabasePayoutRecord {
  id: string
  mitraId: string
  invoicePeriodId: string
  month: number
  year: number
  amount: number
  visitCount: number
  percentage: number
  createdAt: Date
}

export async function example5_DatabaseIntegration(
  invoicePeriod: { id: string; start: Date; end: Date },
  mitraId: string,
  totalPayout: number,
  visits: Visit[]
): Promise<DatabasePayoutRecord[]> {
  console.log('\n=== Example 5: Database Integration Pattern ===\n')

  // Step 1: Split payout
  const monthlyPayouts = splitPayoutAcrossMonths(
    invoicePeriod,
    totalPayout,
    visits,
    invoicePeriod.id
  )

  // Step 2: Convert to database records
  const dbRecords: DatabasePayoutRecord[] = monthlyPayouts.map(payout => ({
    id: `PAY-${invoicePeriod.id}-${payout.year}-${payout.month}`,
    mitraId,
    invoicePeriodId: payout.invoicePeriodId,
    month: payout.month,
    year: payout.year,
    amount: payout.amount,
    visitCount: payout.visitCount,
    percentage: payout.percentage,
    createdAt: new Date()
  }))

  console.log('Generated DB records:')
  dbRecords.forEach(record => {
    console.log(`  ID: ${record.id}`)
    console.log(`  Mitra: ${record.mitraId}`)
    console.log(`  Period: ${record.month}/${record.year}`)
    console.log(`  Amount: Rp${record.amount.toLocaleString('id-ID')}`)
    console.log()
  })

  // Step 3: Save to database (pseudo-code)
  // await db.insert(payoutTable).values(dbRecords)

  return dbRecords
}

// ============================================================================
// Run all examples
// ============================================================================

export function runAllExamples() {
  example1_BasicSplit()
  example2_PayoutCalculation()
  example3_SingleMonth()
  example4_ThreeMonths()

  // Example 5 usage:
  // const records = await example5_DatabaseIntegration(
  //   { id: 'INV-001', start: new Date('2026-01-06'), end: new Date('2026-02-05') },
  //   'MITRA-001',
  //   1_200_000,
  //   [/* visits */]
  // )
}

// Uncomment to run examples:
// runAllExamples()
