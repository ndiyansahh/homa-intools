import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visitDB, visitMitraChangeHistoryDB, mitraDB, customerDB } from '@/lib/schema';
import { eq, and, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { getConfig, CONFIG_KEYS } from '@/lib/config';
import { detectPayoutAdjustment, createPayoutAdjustments } from '@/lib/payout-adjustment';

interface RouteParams {
  params: Promise<{
    id: string; // trial/customer id
    visitId: string;
  }>;
}

// POST - Change mitra for a specific visit
export async function POST(
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

    const { id, visitId } = await params;
    const body = await request.json();
    const { newMitraId, reason } = body;

    if (!newMitraId || !reason || reason.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'New mitra ID and reason are required' },
        { status: 400 }
      );
    }

    // Get current visit info
    const visitResult = await db
      .select({
        id: visitDB.id,
        customerId: visitDB.customerId,
        mitraId: visitDB.mitraId,
        actualMitraId: visitDB.actualMitraId,
        originalMitraId: visitDB.originalMitraId,
        status: visitDB.status,
        scheduledDate: visitDB.scheduledDate,
      })
      .from(visitDB)
      .where(and(
        eq(visitDB.id, visitId),
        eq(visitDB.customerId, id)
      ))
      .limit(1);

    if (visitResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Visit not found' },
        { status: 404 }
      );
    }

    const visit = visitResult[0];

    // Check if completed visits should be locked (Feedback 6b)
    const lockCompletedVisits = await getConfig(CONFIG_KEYS.LOCK_COMPLETED_VISITS, false);

    if (lockCompletedVisits && visit.status === 'Done') {
      return NextResponse.json(
        { success: false, message: 'Cannot change mitra for completed visit (locked by admin)' },
        { status: 400 }
      );
    }

    // If lock is disabled, allow changing mitra even for completed visits
    if (!lockCompletedVisits && visit.status === 'Done') {
      console.log(`⚠️  Changing mitra for completed visit ${visitId} - lock is DISABLED (Feedback 6b)`);
    }

    // Check if new mitra exists and is active
    const newMitraResult = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        status: mitraDB.status,
        mitraCityAssignment: mitraDB.mitraCityAssignment,
        mitraLocationAssignment: mitraDB.mitraLocationAssignment,
      })
      .from(mitraDB)
      .where(eq(mitraDB.id, newMitraId))
      .limit(1);

    if (newMitraResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'New mitra not found' },
        { status: 404 }
      );
    }

    const newMitra = newMitraResult[0];

    if (newMitra.status !== 'Active') {
      return NextResponse.json(
        { success: false, message: 'Selected mitra is not active' },
        { status: 400 }
      );
    }

    // Get customer location for region validation
    const customerResult = await db
      .select({
        city: customerDB.city,
        district: customerDB.district,
      })
      .from(customerDB)
      .where(eq(customerDB.id, id))
      .limit(1);

    if (customerResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult[0];

    // Validate region match (if assignment data exists)
    if (newMitra.mitraCityAssignment || newMitra.mitraLocationAssignment) {
      // Check city match first
      if (newMitra.mitraCityAssignment !== customer.city) {
        return NextResponse.json(
          {
            success: false,
            message: `Mitra ${newMitra.mitraName} does not cover customer's city (${customer.city})`
          },
          { status: 400 }
        );
      }

      // Check district match if both exist
      if (customer.district && newMitra.mitraLocationAssignment) {
        try {
          const districts = typeof newMitra.mitraLocationAssignment === 'string'
            ? JSON.parse(newMitra.mitraLocationAssignment)
            : newMitra.mitraLocationAssignment;

          if (Array.isArray(districts) && !districts.includes(customer.district)) {
            return NextResponse.json(
              {
                success: false,
                message: `Mitra ${newMitra.mitraName} does not cover customer's district (${customer.district}). Covered districts: ${districts.join(', ')}`
              },
              { status: 400 }
            );
          }
        } catch (error) {
          console.warn('Failed to parse mitra location assignment:', error);
        }
      }
    }

    // Get current sequence number for this visit
    const historyCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(visitMitraChangeHistoryDB)
      .where(eq(visitMitraChangeHistoryDB.visitId, visitId));

    const sequenceNumber = Number(historyCount[0]?.count || 0) + 1;

    const fromMitraId = visit.actualMitraId || visit.originalMitraId;

    // Create history record
    await db.insert(visitMitraChangeHistoryDB).values({
      visitId: visitId,
      fromMitraId: fromMitraId!,
      toMitraId: newMitraId,
      changeReason: reason.trim(),
      sequenceNumber: sequenceNumber,
      changedBy: session.id,
    });

    // Update visit actualMitraId
    await db
      .update(visitDB)
      .set({
        actualMitraId: newMitraId,
        mitraId: newMitraId, // Also update for backward compatibility
        updatedAt: new Date(),
      })
      .where(eq(visitDB.id, visitId));

    console.log(`✅ Mitra changed for visit ${visitId}: ${fromMitraId} → ${newMitraId} (Sequence #${sequenceNumber})`);

    // Feature 8b: Detect payout adjustments needed when mitra changes
    try {
      const adjustments = await detectPayoutAdjustment({
        visitId,
        oldStatus: visit.status || 'Scheduled',
        newStatus: visit.status || 'Scheduled', // Status didn't change
        oldMitraId: visit.mitraId,
        newMitraId: newMitraId,
        oldActualMitraId: fromMitraId || null,
        newActualMitraId: newMitraId,
        userEmail: session.email,
      });

      if (adjustments && adjustments.length > 0) {
        await createPayoutAdjustments(adjustments);
        console.log(`📊 Created ${adjustments.length} payout adjustment(s) for mitra change on visit ${visitId}`);
      }
    } catch (adjustmentError) {
      // Log error but don't fail the mitra change
      console.error('Error creating payout adjustment:', adjustmentError);
    }

    return NextResponse.json({
      success: true,
      message: 'Mitra changed successfully',
      data: {
        visitId,
        fromMitraId,
        toMitraId: newMitraId,
        sequenceNumber,
      },
    });

  } catch (error) {
    console.error('Error changing mitra:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to change mitra' },
      { status: 500 }
    );
  }
}

// GET - Get mitra change history for a visit
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

    const { visitId } = await params;

    // Get change history with mitra names
    const history = await db
      .select({
        id: visitMitraChangeHistoryDB.id,
        visitId: visitMitraChangeHistoryDB.visitId,
        fromMitraId: visitMitraChangeHistoryDB.fromMitraId,
        toMitraId: visitMitraChangeHistoryDB.toMitraId,
        changeReason: visitMitraChangeHistoryDB.changeReason,
        sequenceNumber: visitMitraChangeHistoryDB.sequenceNumber,
        changedBy: visitMitraChangeHistoryDB.changedBy,
        changedAt: visitMitraChangeHistoryDB.changedAt,
      })
      .from(visitMitraChangeHistoryDB)
      .where(eq(visitMitraChangeHistoryDB.visitId, visitId))
      .orderBy(visitMitraChangeHistoryDB.sequenceNumber);

    // Fetch mitra names for all involved mitras
    const mitraIds = new Set<string>();
    history.forEach(h => {
      mitraIds.add(h.fromMitraId);
      mitraIds.add(h.toMitraId);
    });

    const mitrasData = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
      })
      .from(mitraDB)
      .where(sql`${mitraDB.id} IN ${Array.from(mitraIds)}`);

    const mitraMap = new Map(mitrasData.map(m => [m.id, m.mitraName]));

    // Enrich history with mitra names
    const enrichedHistory = history.map(h => ({
      ...h,
      fromMitraName: mitraMap.get(h.fromMitraId) || 'Unknown',
      toMitraName: mitraMap.get(h.toMitraId) || 'Unknown',
    }));

    return NextResponse.json({
      success: true,
      data: enrichedHistory,
    });

  } catch (error) {
    console.error('Error fetching mitra change history:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch mitra change history' },
      { status: 500 }
    );
  }
}
