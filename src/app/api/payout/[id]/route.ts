import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { payoutDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// PUT - Update payout (mainly for bonus amount)
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { bonusAmount, notes, status } = body;

    console.log(`📝 Updating payout ${id}:`, { bonusAmount, notes, status });

    // Get current payout
    const currentPayout = await db
      .select()
      .from(payoutDB)
      .where(eq(payoutDB.id, id))
      .limit(1);

    if (currentPayout.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Payout record not found' },
        { status: 404 }
      );
    }

    const payout = currentPayout[0];

    // Check if lainnya is eligible
    if (bonusAmount !== undefined && !payout.bonusEligible) {
      return NextResponse.json(
        { success: false, message: 'Mitra is not eligible for lainnya' },
        { status: 400 }
      );
    }

    // Calculate new total payout
    const newBonusAmount = bonusAmount !== undefined ? Number(bonusAmount) : Number(payout.bonusAmount);
    const basePayout = Number(payout.basePayout);
    const newTotalPayout = basePayout + newBonusAmount;

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (bonusAmount !== undefined) {
      updateData.bonusAmount = newBonusAmount.toString();
      updateData.totalPayout = newTotalPayout.toString();
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (status !== undefined) {
      updateData.status = status;
      if (status === 'Paid') {
        updateData.paidAt = new Date();
      }
    }

    await db
      .update(payoutDB)
      .set(updateData)
      .where(eq(payoutDB.id, id));

    // Log audit event
    await logAuditEvent({
      action: 'PAYOUT_UPDATED',
      userId: session.userId,
      email: session.email,
      details: {
        payoutId: payout.payoutId,
        changes: updateData,
      }
    });

    console.log(`✅ Updated payout ${payout.payoutId}`);

    return NextResponse.json({
      success: true,
      message: 'Payout updated successfully',
    });

  } catch (error) {
    console.error('Error updating payout:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update payout' },
      { status: 500 }
    );
  }
}

// GET - Get single payout details
export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id } = await params;

    const payout = await db
      .select()
      .from(payoutDB)
      .where(eq(payoutDB.id, id))
      .limit(1);

    if (payout.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Payout not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: payout[0],
    });

  } catch (error) {
    console.error('Error fetching payout:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch payout' },
      { status: 500 }
    );
  }
}
