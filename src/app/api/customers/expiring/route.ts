import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { invoiceDB, customerDB } from '@/lib/schema'
import { and, eq, isNull, or, sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const todayJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    todayJkt.setHours(0, 0, 0, 0)

    const results = await db
      .select({
        id: invoiceDB.id,
        invoiceNumber: invoiceDB.invoiceNumber,
        invoiceCustomerName: invoiceDB.invoiceCustomerName,
        invoiceEndDate: invoiceDB.invoiceEndDate,
        status: invoiceDB.status,
        totalAmount: invoiceDB.totalAmount,
        customerId: invoiceDB.customerId,
        invoiceStartDate: invoiceDB.invoiceStartDate,
      })
      .from(invoiceDB)
      .where(
        and(
          // invoice_end_date dalam 7 hari ke depan (termasuk yang sudah lewat)
          sql`${invoiceDB.invoiceEndDate}::date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + INTERVAL '7 days'`,
          // Bukan deleted
          or(
            eq(invoiceDB.isDeleted, false),
            isNull(invoiceDB.isDeleted)
          )
        )
      )
      .orderBy(invoiceDB.invoiceEndDate)

    const expiringInvoices = results.map((invoice) => {
      let daysUntilExpiry = 0
      if (invoice.invoiceEndDate) {
        const endDate = new Date(invoice.invoiceEndDate)
        endDate.setHours(0, 0, 0, 0)
        daysUntilExpiry = Math.round(
          (endDate.getTime() - todayJkt.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.invoiceCustomerName,
        invoiceEndDate: invoice.invoiceEndDate ?? null,
        invoiceStartDate: invoice.invoiceStartDate ?? null,
        status: invoice.status ?? 'Open',
        totalAmount: invoice.totalAmount ? Number(invoice.totalAmount) : 0,
        customerId: invoice.customerId,
        daysUntilExpiry,
      }
    })

    return NextResponse.json({
      success: true,
      data: expiringInvoices,
      total: expiringInvoices.length,
    })
  } catch (error) {
    console.error('[GET /api/customers/expiring]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
