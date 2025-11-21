import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutDB, mitraDB, visitDB } from '@/lib/schema';
import { eq, and, desc, gte, lte, like, count } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';

// GET - Fetch all payout records with filters
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
    const year = searchParams.get('year');
    const month = searchParams.get('month');
    const mitraName = searchParams.get('mitraName') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    console.log('📊 Fetching payouts with filters:', {
      year,
      month,
      mitraName,
      page,
      limit
    });

    // Build where conditions
    const conditions = [];

    if (year) {
      conditions.push(eq(payoutDB.year, parseInt(year)));
    }

    if (month) {
      conditions.push(eq(payoutDB.month, parseInt(month)));
    }

    if (mitraName) {
      conditions.push(like(mitraDB.mitraName, `%${mitraName}%`));
    }

    // Fetch payouts with mitra data
    const payouts = await db
      .select({
        id: payoutDB.id,
        payoutId: payoutDB.payoutId,
        mitraId: payoutDB.mitraId,
        mitraName: mitraDB.mitraName,
        year: payoutDB.year,
        month: payoutDB.month,
        payoutDate: payoutDB.payoutDate,
        totalVisits: payoutDB.totalVisits,
        pricePerVisit: payoutDB.pricePerVisit,
        basePayout: payoutDB.basePayout,
        bonusAmount: payoutDB.bonusAmount,
        totalPayout: payoutDB.totalPayout,
        status: payoutDB.status,
        bonusEligible: payoutDB.bonusEligible,
        notes: payoutDB.notes,
        paidAt: payoutDB.paidAt,
        createdAt: payoutDB.createdAt,
        updatedAt: payoutDB.updatedAt,
      })
      .from(payoutDB)
      .leftJoin(mitraDB, eq(payoutDB.mitraId, mitraDB.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(payoutDB.payoutDate), desc(payoutDB.createdAt))
      .limit(limit)
      .offset(offset);

    console.log(`✅ Found ${payouts.length} payout records`);

    // Get total count for pagination
    const totalResult = await db
      .select({ count: count() })
      .from(payoutDB)
      .leftJoin(mitraDB, eq(payoutDB.mitraId, mitraDB.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    const total = Number(totalResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);

    const response = {
      success: true,
      items: payouts,
      data: payouts,
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Get payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Generate monthly payout records
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can generate payouts
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { year, month } = body;

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    console.log(`🔄 Generating payouts for ${year}-${String(month).padStart(2, '0')}`);

    // Check if payouts for this period already exist
    const existingPayouts = await db
      .select()
      .from(payoutDB)
      .where(
        and(
          eq(payoutDB.year, year),
          eq(payoutDB.month, month)
        )
      )
      .limit(1);

    if (existingPayouts.length > 0) {
      return NextResponse.json({
        success: false,
        message: `Payouts for ${year}-${String(month).padStart(2, '0')} have already been generated`
      }, { status: 400 });
    }

    // Get all active mitras
    const mitras = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        bonusCommission: mitraDB.mitraBonusCommission,
        baseRate: mitraDB.baseRate,
      })
      .from(mitraDB)
      .where(eq(mitraDB.isActive, true));

    const payoutRecords = [];
    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0); // Last day of month
    const lastDayOfMonth = monthEnd.toISOString().split('T')[0];

    console.log(`📅 Period: ${monthStart.toISOString().split('T')[0]} to ${lastDayOfMonth}`);

    for (const mitra of mitras) {
      // Count completed visits for this mitra in the given month
      const visits = await db
        .select({ id: visitDB.id })
        .from(visitDB)
        .where(
          and(
            eq(visitDB.actualMitraId, mitra.id),
            eq(visitDB.status, 'Done'),
            gte(visitDB.completedAt, monthStart),
            lte(visitDB.completedAt, monthEnd)
          )
        );

      const totalVisits = visits.length;

      if (totalVisits === 0) {
        console.log(`⏭️  Skipping ${mitra.mitraName} - no completed visits`);
        continue; // Skip if no visits
      }

      const pricePerVisit = Number(mitra.baseRate) || 0;
      const basePayout = totalVisits * pricePerVisit;
      const bonusEligible = mitra.bonusCommission === 'Eligible';
      const bonusAmount = 0; // Default 0, can be edited later

      // Generate payout ID: PAY/MitraName/YYYY.MM.DD-XXXXX
      const mitraNameClean = mitra.mitraName.replace(/\s+/g, '');
      const sequence: string = String(payoutRecords.length + 1).padStart(5, '0');
      const payoutId = `PAY/${mitraNameClean}/${year}.${String(month).padStart(2, '0')}.${String(monthEnd.getDate()).padStart(2, '0')}-${sequence}`;

      payoutRecords.push({
        payoutId,
        mitraId: mitra.id,
        year,
        month,
        payoutDate: lastDayOfMonth,
        totalVisits,
        pricePerVisit: pricePerVisit.toString(),
        basePayout: basePayout.toString(),
        bonusAmount: bonusAmount.toString(),
        totalPayout: (basePayout + bonusAmount).toString(),
        status: 'Pending',
        bonusEligible,
      });

      console.log(`✅ Generated payout for ${mitra.mitraName}: ${totalVisits} visits × Rp${pricePerVisit} = Rp${basePayout}`);
    }

    if (payoutRecords.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No payouts to generate for this period'
      }, { status: 400 });
    }

    // Insert payout records
    await db.insert(payoutDB).values(payoutRecords);

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'PAYOUT_GENERATED',
        userId: session.userId,
        email: session.email,
        details: {
          year,
          month,
          totalPayouts: payoutRecords.length,
        }
      });
    }

    console.log(`🎉 Generated ${payoutRecords.length} payout records`);

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${payoutRecords.length} payout records`,
      data: {
        year,
        month,
        totalPayouts: payoutRecords.length,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Generate payout error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
