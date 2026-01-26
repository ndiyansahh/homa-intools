import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutAdjustmentDB, mitraDB, payoutDB, visitDB, customerDB } from '@/lib/schema';
import { eq, and, desc, or, like } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';

// GET - List all payout adjustments with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const mitraName = searchParams.get('mitraName') || '';
    const status = searchParams.get('status') || '';
    const adjustmentType = searchParams.get('adjustmentType') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const offset = (page - 1) * limit;

    console.log('📊 Fetching payout adjustments with filters:', {
      mitraName,
      status,
      adjustmentType,
      page,
      limit
    });

    // Build query
    const adjustments = await db
      .select({
        // Adjustment fields
        id: payoutAdjustmentDB.id,
        adjustmentId: payoutAdjustmentDB.adjustmentId,
        adjustmentAmount: payoutAdjustmentDB.adjustmentAmount,
        adjustmentType: payoutAdjustmentDB.adjustmentType,
        reason: payoutAdjustmentDB.reason,
        status: payoutAdjustmentDB.status,
        originalYear: payoutAdjustmentDB.originalYear,
        originalMonth: payoutAdjustmentDB.originalMonth,
        appliedYear: payoutAdjustmentDB.appliedYear,
        appliedMonth: payoutAdjustmentDB.appliedMonth,
        originalVisits: payoutAdjustmentDB.originalVisits,
        correctedVisits: payoutAdjustmentDB.correctedVisits,
        originalPayout: payoutAdjustmentDB.originalPayout,
        correctedPayout: payoutAdjustmentDB.correctedPayout,
        createdAt: payoutAdjustmentDB.createdAt,
        createdBy: payoutAdjustmentDB.createdBy,
        appliedAt: payoutAdjustmentDB.appliedAt,

        // Mitra info
        mitraId: mitraDB.id,
        mitraName: mitraDB.mitraName,

        // Related payout info
        originalPayoutId: payoutDB.payoutId,
        appliedPayoutId: payoutAdjustmentDB.appliedPayoutId,
      })
      .from(payoutAdjustmentDB)
      .leftJoin(mitraDB, eq(payoutAdjustmentDB.mitraId, mitraDB.id))
      .leftJoin(payoutDB, eq(payoutAdjustmentDB.originalPayoutId, payoutDB.id))
      .orderBy(desc(payoutAdjustmentDB.createdAt))
      .limit(limit)
      .offset(offset);

    return NextResponse.json({
      success: true,
      data: adjustments,
      pagination: {
        page,
        limit,
        total: adjustments.length,
      }
    });

  } catch (error) {
    console.error('Fetch adjustments error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create manual adjustment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden - Only ADMIN/OWNER can create manual adjustments' }, { status: 403 });
    }

    const body = await request.json();
    const {
      mitraId,
      adjustmentAmount,
      reason,
      notes,
    } = body;

    if (!mitraId || !adjustmentAmount || !reason) {
      return NextResponse.json({
        error: 'Missing required fields: mitraId, adjustmentAmount, reason'
      }, { status: 400 });
    }

    // Get mitra name for adjustment ID
    const mitraData = await db
      .select({ mitraName: mitraDB.mitraName })
      .from(mitraDB)
      .where(eq(mitraDB.id, mitraId))
      .limit(1);

    if (!mitraData.length) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    const mitraName = mitraData[0].mitraName;

    // Generate adjustment ID
    const now = new Date();
    const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')}`;
    const mitraNameClean = mitraName.replace(/\s+/g, '');
    const sequence = String(Math.floor(Math.random() * 99999)).padStart(5, '0');
    const adjustmentId = `ADJ/${mitraNameClean}/${dateStr}-${sequence}`;

    // Create adjustment
    const adjustment = await db.insert(payoutAdjustmentDB).values({
      adjustmentId,
      mitraId,
      adjustmentAmount: adjustmentAmount.toString(),
      adjustmentType: 'MANUAL_ADJUSTMENT',
      reason,
      notes,
      status: 'PENDING',
      createdBy: session.email,
    }).returning();

    // Log audit
    await logAuditEvent({
      action: 'PAYOUT_ADJUSTMENT_CREATED',
      userId: session.userId,
      email: session.email,
      details: {
        adjustmentId,
        mitraId,
        amount: adjustmentAmount,
        type: 'MANUAL_ADJUSTMENT',
      }
    });

    console.log(`✅ Created manual adjustment ${adjustmentId} for ${mitraName}: ${adjustmentAmount > 0 ? '+' : ''}Rp${Number(adjustmentAmount).toLocaleString()}`);

    return NextResponse.json({
      success: true,
      message: 'Manual adjustment created successfully',
      data: adjustment[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Create adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update adjustment status (approve/reject/cancel)
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { adjustmentId, status: newStatus, notes } = body;

    if (!adjustmentId || !newStatus) {
      return NextResponse.json({
        error: 'Missing required fields: adjustmentId, status'
      }, { status: 400 });
    }

    if (!['PENDING', 'CANCELLED', 'REJECTED'].includes(newStatus)) {
      return NextResponse.json({
        error: 'Invalid status. Allowed: PENDING, CANCELLED, REJECTED'
      }, { status: 400 });
    }

    // Update adjustment
    const updated = await db
      .update(payoutAdjustmentDB)
      .set({
        status: newStatus,
        notes: notes || payoutAdjustmentDB.notes,
        approvedBy: session.email,
        approvedAt: new Date(),
      })
      .where(eq(payoutAdjustmentDB.id, adjustmentId))
      .returning();

    if (!updated.length) {
      return NextResponse.json({ error: 'Adjustment not found' }, { status: 404 });
    }

    // Log audit
    await logAuditEvent({
      action: 'PAYOUT_ADJUSTMENT_UPDATED',
      userId: session.userId,
      email: session.email,
      details: {
        adjustmentId: updated[0].adjustmentId,
        newStatus,
      }
    });

    console.log(`✅ Updated adjustment ${updated[0].adjustmentId} status to ${newStatus}`);

    return NextResponse.json({
      success: true,
      message: `Adjustment status updated to ${newStatus}`,
      data: updated[0],
    });

  } catch (error) {
    console.error('Update adjustment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
