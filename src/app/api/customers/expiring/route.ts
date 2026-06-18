import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customerDB, mitraDB } from '@/lib/schema'
import { and, eq, sql, isNull, or } from 'drizzle-orm'
import { getSession } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const results = await db
      .select({
        id: customerDB.id,
        customerName: customerDB.customerName,
        subscriptionPackage: customerDB.subscriptionPackage,
        subscriptionEnd: customerDB.subscriptionEnd,
        subscriptionStart: customerDB.subscriptionStart,
        monthlyFee: customerDB.monthlyFee,
        city: customerDB.city,
        address: customerDB.address,
        district: customerDB.district,
        village: customerDB.village,
        postalCode: customerDB.postalCode,
        assignedMitraId: customerDB.assignedMitraId,
        assignedMitraName: mitraDB.mitraName,
        backupMitraIds: customerDB.backupMitraIds,
        contact: customerDB.contact,
        subscriptionPackageId: customerDB.subscriptionPackageId,
        dayPattern: customerDB.dayPattern,
        ltv: customerDB.ltv,
      })
      .from(customerDB)
      .leftJoin(mitraDB, eq(customerDB.assignedMitraId, mitraDB.id))
      .where(
        and(
          // H-7: subscriptionEnd <= today + 7 days
          sql`${customerDB.subscriptionEnd}::date <= (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date + INTERVAL '7 days'`,
          // Hanya Active
          eq(customerDB.subscriptionStatus, 'Active'),
          // Bukan deleted
          or(
            eq(customerDB.isDeleted, false),
            isNull(customerDB.isDeleted)
          )
        )
      )
      .orderBy(customerDB.subscriptionEnd)

    const todayJkt = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }))
    todayJkt.setHours(0, 0, 0, 0)

    const expiringCustomers = results.map((customer) => {
      let daysUntilExpiry = 0
      if (customer.subscriptionEnd) {
        const endDate = new Date(customer.subscriptionEnd)
        endDate.setHours(0, 0, 0, 0)
        daysUntilExpiry = Math.round(
          (endDate.getTime() - todayJkt.getTime()) / (1000 * 60 * 60 * 24)
        )
      }

      return {
        id: customer.id,
        customerName: customer.customerName,
        subscriptionPackage: customer.subscriptionPackage ?? null,
        subscriptionEnd: customer.subscriptionEnd ?? null,
        subscriptionStart: customer.subscriptionStart ?? null,
        monthlyFee: customer.monthlyFee ? Number(customer.monthlyFee) : 0,
        city: customer.city,
        address: customer.address,
        district: customer.district ?? null,
        village: customer.village ?? null,
        postalCode: customer.postalCode ?? null,
        contact: customer.contact ?? '',
        assignedMitraId: customer.assignedMitraId ?? null,
        assignedMitraName: customer.assignedMitraName ?? null,
        backupMitraIds: customer.backupMitraIds ?? [],
        subscriptionPackageId: customer.subscriptionPackageId ?? null,
        dayPattern: customer.dayPattern ?? null,
        ltv: customer.ltv ?? 0,
        daysUntilExpiry,
      }
    })

    return NextResponse.json({
      success: true,
      data: expiringCustomers,
      total: expiringCustomers.length,
    })
  } catch (error) {
    console.error('[GET /api/customers/expiring]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
