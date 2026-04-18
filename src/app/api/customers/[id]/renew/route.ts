import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customerDB, visitDB, mitraDB, subscriptionPackageDB, invoiceDB } from '@/lib/schema'
import { eq, max, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'
import { generateScheduleDates } from '@/lib/utils/subscriptionUtils'

interface RouteParams {
  params: Promise<{ id: string }>
}

interface RenewRequestBody {
  newStartDate?: string
  packageId?: string
  mitraId?: string
  qtyPackage?: number
  dayPattern?: {
    day1?: string
    day2?: string
    day3?: string
  }
  address?: string
  city?: string
  district?: string
  village?: string
  postalCode?: string
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    // Auth check
    const session = await getSession()
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    // RBAC: only ADMIN and OWNER
    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden: only ADMIN or OWNER can renew subscriptions' },
        { status: 403 }
      )
    }

    const { id: customerId } = await params

    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      )
    }

    // Parse request body
    let body: RenewRequestBody = {}
    try {
      body = await request.json()
    } catch {
      // Empty body is fine — all fields are optional
    }

    // 1. Get customer from DB
    const customerResult = await db
      .select()
      .from(customerDB)
      .where(eq(customerDB.id, customerId))
      .limit(1)

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      )
    }

    const customer = customerResult[0]

    // 2. Resolve newStartDate
    let resolvedStartDate: Date
    if (body.newStartDate) {
      resolvedStartDate = new Date(body.newStartDate + 'T00:00:00+07:00')
    } else if (customer.subscriptionEnd) {
      // subscriptionEnd + 1 day
      const endDate = new Date(customer.subscriptionEnd + 'T00:00:00+07:00')
      endDate.setDate(endDate.getDate() + 1)
      resolvedStartDate = endDate
    } else {
      // Fallback: today in Jakarta time
      const now = new Date()
      const jakartaOffset = 7 * 60 // minutes
      const jakartaTime = new Date(now.getTime() + jakartaOffset * 60 * 1000)
      resolvedStartDate = new Date(jakartaTime.toISOString().split('T')[0] + 'T00:00:00+07:00')
    }

    // 3. Resolve packageId
    const resolvedPackageId = body.packageId ?? customer.subscriptionPackageId

    if (!resolvedPackageId) {
      return NextResponse.json(
        { success: false, message: 'Package ID is required but could not be resolved from customer data' },
        { status: 400 }
      )
    }

    // 4. Resolve mitraId
    const resolvedMitraId = body.mitraId ?? customer.assignedMitraId

    if (!resolvedMitraId) {
      return NextResponse.json(
        { success: false, message: 'Mitra ID is required but could not be resolved from customer data' },
        { status: 400 }
      )
    }

    // 5. Resolve dayPattern
    let resolvedDayPattern: { day1?: string; day2?: string; day3?: string }
    if (body.dayPattern) {
      resolvedDayPattern = body.dayPattern
    } else if (customer.dayPattern) {
      try {
        resolvedDayPattern = JSON.parse(customer.dayPattern)
      } catch {
        resolvedDayPattern = {}
      }
    } else {
      resolvedDayPattern = {}
    }

    // Extract active days as array
    const selectedDays = [
      resolvedDayPattern.day1,
      resolvedDayPattern.day2,
      resolvedDayPattern.day3,
    ].filter((day): day is string => !!day && day !== '')

    if (selectedDays.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Day pattern is required but could not be resolved from customer data' },
        { status: 400 }
      )
    }

    // 6. Get package from DB
    const packageResult = await db
      .select()
      .from(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.id, resolvedPackageId))
      .limit(1)

    if (packageResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Subscription package not found' },
        { status: 404 }
      )
    }

    const pkg = packageResult[0]

    // 7. Compute newEndDate = startDate + qtyPackage months - 1 day (Jakarta-aligned)
    const qty = body.qtyPackage && body.qtyPackage > 0 ? body.qtyPackage : 1
    const newEndDate = new Date(resolvedStartDate)
    newEndDate.setMonth(newEndDate.getMonth() + qty)
    newEndDate.setDate(newEndDate.getDate() - 1)

    // 8. Generate scheduled dates
    const scheduledDates = generateScheduleDates(resolvedStartDate, newEndDate, selectedDays)

    if (scheduledDates.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No scheduled dates could be generated for the given day pattern and period' },
        { status: 400 }
      )
    }

    // 9. Get max visitNumber for this customer
    const maxVisitResult = await db
      .select({ maxVisit: max(visitDB.visitNumber) })
      .from(visitDB)
      .where(eq(visitDB.customerId, customerId))

    const currentMaxVisitNumber = maxVisitResult[0]?.maxVisit ?? 0

    // Format date as YYYY-MM-DD string without timezone drift
    const formatDate = (date: Date): string => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }

    const newStartDateStr = formatDate(resolvedStartDate)
    const newEndDateStr = formatDate(newEndDate)
    const newLtv = (customer.ltv ?? 0) + 1
    const newTotalSessions = (customer.totalSessions ?? 0) + scheduledDates.length

    // 10. Generate invoice sequence number (outside transaction to avoid lock contention)
    const seqResult = await db.execute(
      sql`SELECT COALESCE(MAX(invoice_no), 0) + 1 AS next_no FROM invoice_db`
    )
    const invoiceSequenceNumber = (seqResult.rows[0]?.next_no as number) || 1

    // Build invoice number: INV/Cleaning/YYYY.M.DD-#####
    const sy = resolvedStartDate.getFullYear()
    const sm = resolvedStartDate.getMonth() + 1
    const sd = String(resolvedStartDate.getDate()).padStart(2, '0')
    const invoiceNumber = `INV/Cleaning/${sy}.${sm}.${sd}-${String(invoiceSequenceNumber).padStart(5, '0')}`

    const pricePerQty = Number(pkg.priceNumeric) || 0
    const promoDiscount = 0
    const totalAmount = pricePerQty - promoDiscount

    const PREFIX = 'Monthly Subscription of '
    const rawPkg = pkg.subscriptionPackage || 'Cleaning'
    const invoiceSubscription = rawPkg.startsWith(PREFIX) ? rawPkg : `${PREFIX}${rawPkg}`

    const dueDate = new Date(resolvedStartDate)
    dueDate.setDate(dueDate.getDate() + 2)

    // 11. Transaction: update customer + insert visits + insert invoice
    let newInvoiceId: string | null = null
    await db.transaction(async (tx) => {
      // Build address update fields (only if provided in body)
      const addressUpdates: Partial<typeof customerDB.$inferInsert> = {}
      if (body.address !== undefined) addressUpdates.address = body.address
      if (body.city !== undefined) addressUpdates.city = body.city
      if (body.district !== undefined) addressUpdates.district = body.district
      if (body.village !== undefined) addressUpdates.village = body.village
      if (body.postalCode !== undefined) addressUpdates.postalCode = body.postalCode

      // Insert invoice first so we have its ID
      const invoiceResult = await tx.insert(invoiceDB).values({
        customerId,
        invoiceNumber,
        invoiceNo: invoiceSequenceNumber,
        invoiceStartDate: newStartDateStr,
        invoiceEndDate: newEndDateStr,
        invoiceYears: sy,
        invoiceMonths: sm,
        invoiceDays: resolvedStartDate.getDate(),
        invoiceSubscription,
        invoiceCustomerName: customer.customerName,
        invoiceAddress: (body.address ?? customer.address) || '',
        invoicePhoneNumber: (customer.contact || '').substring(0, 20),
        invoiceQty: 1,
        invoicePricePerQty: pricePerQty.toString(),
        invoicePromoCode: null,
        invoicePromoDiscount: '0',
        invoiceDate: resolvedStartDate,
        dueDate,
        subtotal: pricePerQty.toString(),
        tax: '0',
        discount: '0',
        totalAmount: totalAmount.toString(),
        status: 'Pending',
      }).returning({ id: invoiceDB.id })

      newInvoiceId = invoiceResult[0].id

      // Update customerDB (including invoiceId pointing to latest invoice)
      await tx.update(customerDB).set({
        subscriptionStart: newStartDateStr,
        subscriptionEnd: newEndDateStr,
        subscriptionStatus: 'Active',
        ltv: newLtv,
        assignedMitraId: resolvedMitraId,
        subscriptionPackageId: resolvedPackageId,
        subscriptionPackage: pkg.subscriptionPackage,
        qtyPackage: qty,
        monthlyFee: (Number(pkg.priceNumeric) * qty).toString(),
        dayPattern: JSON.stringify({
          day1: resolvedDayPattern.day1 ?? null,
          day2: resolvedDayPattern.day2 ?? null,
          day3: resolvedDayPattern.day3 ?? null,
        }),
        totalSessions: newTotalSessions,
        invoiceId: newInvoiceId,
        ...addressUpdates,
        updatedAt: new Date(),
      }).where(eq(customerDB.id, customerId))

      // Insert new visit records
      const visitRecords = scheduledDates.map((date, index) => ({
        customerId,
        mitraId: resolvedMitraId,
        visitNumber: currentMaxVisitNumber + index + 1,
        scheduledDate: formatDate(date),
        scheduledDay: date.toLocaleDateString('en-US', { weekday: 'long' }),
        status: 'Done' as const,
        completedAt: date,
        durationHours: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
        updatedBy: session.email,
      }))

      await tx.insert(visitDB).values(visitRecords)
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription renewed successfully',
      data: {
        customerId,
        newPeriod: {
          start: newStartDateStr,
          end: newEndDateStr,
        },
        invoice: {
          id: newInvoiceId,
          invoiceNumber,
        },
        totalNewVisits: scheduledDates.length,
        newLtv,
      },
    })
  } catch (error) {
    console.error('[POST /api/customers/[id]/renew] Error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}
