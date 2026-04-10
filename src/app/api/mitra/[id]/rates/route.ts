import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { mitraRateConfigDB, mitraDB } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';

// GET - Fetch all rate configurations for a specific mitra
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: mitraId } = await params;

    const rateConfigs = await db
      .select({
        id: mitraRateConfigDB.id,
        mitraId: mitraRateConfigDB.mitraId,
        visitsPerWeek: mitraRateConfigDB.visitsPerWeek,
        payoutRate: mitraRateConfigDB.payoutRate,
        createdAt: mitraRateConfigDB.createdAt,
        updatedAt: mitraRateConfigDB.updatedAt,
        createdBy: mitraRateConfigDB.createdBy,
      })
      .from(mitraRateConfigDB)
      .where(eq(mitraRateConfigDB.mitraId, mitraId))
      .orderBy(desc(mitraRateConfigDB.createdAt));

    return NextResponse.json({
      success: true,
      data: rateConfigs,
    });

  } catch (error) {
    console.error('Get mitra rate configs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
