import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const todayJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    todayJkt.setHours(0, 0, 0, 0)

    const results = await db.execute(sql`
      SELECT DISTINCT ON (customer_id)
        id,
        invoice_number,
        invoice_customer_name,
        invoice_end_date,
        status,
        total_amount,
        customer_id,
        invoice_start_date
      FROM invoice_db
      WHERE
        invoice_end_date::date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + INTERVAL '7 days'
        AND (is_deleted = false OR is_deleted IS NULL)
      ORDER BY customer_id, invoice_end_date DESC
    `)

    const rows = results.rows

    const expiringInvoices = rows.map((invoice: any) => {
      let daysUntilExpiry = 0
      if (invoice.invoice_end_date) {
        const endDate = new Date(invoice.invoice_end_date)
        endDate.setHours(0, 0, 0, 0)
        daysUntilExpiry = Math.round(
          (endDate.getTime() - todayJkt.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      return {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerName: invoice.invoice_customer_name,
        invoiceEndDate: invoice.invoice_end_date ?? null,
        invoiceStartDate: invoice.invoice_start_date ?? null,
        status: invoice.status ?? 'Open',
        totalAmount: invoice.total_amount ? Number(invoice.total_amount) : 0,
        customerId: invoice.customer_id,
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
