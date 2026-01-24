import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { mitraRateConfigDB, mitraDB, subscriptionPackageDB } from '@/lib/schema';
import { eq, and, desc, like, count } from 'drizzle-orm';

// GET - Fetch all mitra rate configurations with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mitraName = searchParams.get('mitraName') || '';
    const subscriptionPackageId = searchParams.get('subscriptionPackageId');
    const isActive = searchParams.get('isActive');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    console.log('📊 Fetching mitra rate configs with filters:', {
      mitraName,
      subscriptionPackageId,
      isActive,
      page,
      limit
    });

    // Build where conditions
    const conditions = [];

    if (mitraName) {
      conditions.push(like(mitraDB.mitraName, `%${mitraName}%`));
    }

    if (subscriptionPackageId) {
      conditions.push(eq(mitraRateConfigDB.subscriptionPackageId, subscriptionPackageId));
    }

    if (isActive !== null && isActive !== undefined && isActive !== '') {
      conditions.push(eq(mitraRateConfigDB.isActive, isActive === 'true'));
    }

    // Fetch rate configs with mitra and package data
    const rateConfigs = await db
      .select({
        id: mitraRateConfigDB.id,
        mitraId: mitraRateConfigDB.mitraId,
        mitraName: mitraDB.mitraName,
        subscriptionPackageId: mitraRateConfigDB.subscriptionPackageId,
        subscriptionPackageName: subscriptionPackageDB.subscriptionPackage,
        monthlyRate: mitraRateConfigDB.monthlyRate,
        effectiveFrom: mitraRateConfigDB.effectiveFrom,
        effectiveTo: mitraRateConfigDB.effectiveTo,
        notes: mitraRateConfigDB.notes,
        isActive: mitraRateConfigDB.isActive,
        createdAt: mitraRateConfigDB.createdAt,
        updatedAt: mitraRateConfigDB.updatedAt,
        createdBy: mitraRateConfigDB.createdBy,
      })
      .from(mitraRateConfigDB)
      .leftJoin(mitraDB, eq(mitraRateConfigDB.mitraId, mitraDB.id))
      .leftJoin(
        subscriptionPackageDB,
        eq(mitraRateConfigDB.subscriptionPackageId, subscriptionPackageDB.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(mitraRateConfigDB.isActive),
        desc(mitraRateConfigDB.effectiveFrom),
        desc(mitraRateConfigDB.createdAt)
      )
      .limit(limit)
      .offset(offset);

    console.log(`✅ Found ${rateConfigs.length} rate configurations`);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(mitraRateConfigDB)
      .leftJoin(mitraDB, eq(mitraRateConfigDB.mitraId, mitraDB.id))
      .leftJoin(
        subscriptionPackageDB,
        eq(mitraRateConfigDB.subscriptionPackageId, subscriptionPackageDB.id)
      )
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(totalResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    const response = {
      success: true,
      data: rateConfigs,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get mitra rate configs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
