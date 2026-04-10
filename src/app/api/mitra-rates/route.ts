import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { mitraRateConfigDB, mitraDB } from '@/lib/schema';
import { eq, and, desc, like, count } from 'drizzle-orm';

// GET - Fetch all mitra rate configurations with filters and pagination
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mitraName = searchParams.get('mitraName') || '';
    const visitsPerWeek = searchParams.get('visitsPerWeek');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    console.log('📊 Fetching mitra rate configs with filters:', { mitraName, visitsPerWeek, page, limit });

    // Build where conditions
    const conditions = [];

    if (mitraName) {
      conditions.push(like(mitraDB.mitraName, `%${mitraName}%`));
    }

    if (visitsPerWeek) {
      conditions.push(eq(mitraRateConfigDB.visitsPerWeek, parseInt(visitsPerWeek)));
    }

    // Fetch rate configs with mitra data
    const rateConfigs = await db
      .select({
        id: mitraRateConfigDB.id,
        mitraId: mitraRateConfigDB.mitraId,
        mitraName: mitraDB.mitraName,
        mitraCode: mitraDB.mitraCode,
        visitsPerWeek: mitraRateConfigDB.visitsPerWeek,
        payoutRate: mitraRateConfigDB.payoutRate,
        trialRatePerVisit: mitraDB.trialRatePerVisit,
        mitraBonusCommission: mitraDB.mitraBonusCommission,
        bonusRate: mitraDB.bonusRate,
        createdAt: mitraRateConfigDB.createdAt,
        updatedAt: mitraRateConfigDB.updatedAt,
        createdBy: mitraRateConfigDB.createdBy,
      })
      .from(mitraRateConfigDB)
      .leftJoin(mitraDB, eq(mitraRateConfigDB.mitraId, mitraDB.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(
        desc(mitraDB.mitraName),
        desc(mitraRateConfigDB.visitsPerWeek)
      )
      .limit(limit)
      .offset(offset);

    console.log(`✅ Found ${rateConfigs.length} rate configurations`);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(mitraRateConfigDB)
      .leftJoin(mitraDB, eq(mitraRateConfigDB.mitraId, mitraDB.id))
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

// POST - Create new mitra rate configuration
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - Only ADMIN/OWNER can create
    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { mitraId, visitsPerWeek, payoutRate } = body;

    // Validation
    if (!mitraId || !visitsPerWeek || !payoutRate) {
      return NextResponse.json(
        { error: 'Missing required fields: mitraId, visitsPerWeek, payoutRate' },
        { status: 400 }
      );
    }

    // Validate visits per week range (1-7)
    if (visitsPerWeek < 1 || visitsPerWeek > 7) {
      return NextResponse.json(
        { error: 'visitsPerWeek must be between 1 and 7' },
        { status: 400 }
      );
    }

    console.log('📝 Creating mitra rate config:', {
      mitraId,
      visitsPerWeek,
      payoutRate,
      createdBy: session.userId
    });

    // Check for duplicate (mitra_id, visits_per_week)
    const existing = await db
      .select()
      .from(mitraRateConfigDB)
      .where(
        and(
          eq(mitraRateConfigDB.mitraId, mitraId),
          eq(mitraRateConfigDB.visitsPerWeek, visitsPerWeek)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: `Rate already exists for this mitra with ${visitsPerWeek}x/week` },
        { status: 409 } // Conflict
      );
    }

    // Create new rate config
    const newRateConfig = await db
      .insert(mitraRateConfigDB)
      .values({
        mitraId,
        visitsPerWeek,
        payoutRate: payoutRate.toString(),
        createdBy: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(session.userId) ? session.userId : null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    console.log('✅ Mitra rate config created:', newRateConfig[0].id);

    return NextResponse.json({
      success: true,
      data: newRateConfig[0],
      message: 'Rate configuration created successfully'
    });

  } catch (error) {
    console.error('Create mitra rate config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
