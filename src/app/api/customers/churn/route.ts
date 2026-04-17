import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { customerDB, mitraDB } from '@/lib/schema'
import { and, eq, isNull, or } from 'drizzle-orm'
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
        backupMitraId: customerDB.backupMitraId,
        contact: customerDB.contact,
        subscriptionPackageId: customerDB.subscriptionPackageId,
        dayPattern: customerDB.dayPattern,
        ltv: customerDB.ltv,
        churnTag: customerDB.churnTag,
        churnReason: customerDB.churnReason,
      })
      .from(customerDB)
      .leftJoin(mitraDB, eq(customerDB.assignedMitraId, mitraDB.id))
      .where(
        and(
          eq(customerDB.subscriptionStatus, 'Churn'),
          or(
            eq(customerDB.isDeleted, false),
            isNull(customerDB.isDeleted)
          )
        )
      )
      .orderBy(customerDB.updatedAt)

    const churnCustomers = results.map((customer) => ({
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
      backupMitraId: customer.backupMitraId ?? null,
      subscriptionPackageId: customer.subscriptionPackageId ?? null,
      dayPattern: customer.dayPattern ?? null,
      ltv: customer.ltv ?? 0,
      churnTag: customer.churnTag ?? null,
      churnReason: customer.churnReason ?? null,
    }))

    return NextResponse.json({
      success: true,
      data: churnCustomers,
      total: churnCustomers.length,
    })
  } catch (error) {
    console.error('[GET /api/customers/churn]', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
