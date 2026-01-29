import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visitDB, mitraDB, customerDB, auditLogDB } from '@/lib/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logDetailedAudit, getChangedFields } from '@/lib/audit-logger.server';
import { getConfig, CONFIG_KEYS } from '@/lib/config';
import { detectPayoutAdjustment, createPayoutAdjustments } from '@/lib/payout-adjustment';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// GET - Fetch visits for a trial
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

    // Check if this is called from customer page
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // 'customer' or null

    console.log('🔍 Fetching visits for customer ID:', id, '| View:', view || 'trial');

    // Get all visits for this trial (customer)
    const visits = await db
      .select({
        id: visitDB.id,
        customerId: visitDB.customerId,
        mitraId: visitDB.mitraId,
        originalMitraId: visitDB.originalMitraId,
        actualMitraId: visitDB.actualMitraId,
        visitNumber: visitDB.visitNumber,
        scheduledDate: visitDB.scheduledDate,
        scheduledDay: visitDB.scheduledDay,
        actualDate: visitDB.actualDate,
        status: visitDB.status,
        durationHours: visitDB.durationHours,
        visitNotes: visitDB.visitNotes,
        createdAt: visitDB.createdAt,
        updatedAt: visitDB.updatedAt,
        updatedBy: visitDB.updatedBy, // Who last updated this visit
        completedAt: visitDB.completedAt,
        // Include mitra info (actual mitra for display)
        mitraName: mitraDB.mitraName,
        mitraPhone: mitraDB.contact,
        // Include subscription package from customer
        subscriptionPackage: customerDB.subscriptionPackage,
        subscriptionStart: customerDB.subscriptionStart, // To differentiate trial vs customer visits
      })
      .from(visitDB)
      .leftJoin(mitraDB, eq(visitDB.actualMitraId, mitraDB.id))
      .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
      .where(eq(visitDB.customerId, id))
      .orderBy(visitDB.scheduledDate);

    // Filter visits based on view parameter and subscription package
    let filteredVisits = visits;
    if (view === 'customer') {
      const subscriptionPackage = visits[0]?.subscriptionPackage;

      if (subscriptionPackage === 'Trial') {
        // For Trial package in customer view: show ONLY Done visits
        filteredVisits = visits.filter(v => v.status === 'Done');
        console.log('🔒 Trial package - filtering to Done only');
      } else {
        // For Non-Trial packages in customer view: show Done + Scheduled + Cancelled
        filteredVisits = visits.filter(v => v.status === 'Done' || v.status === 'Scheduled' || v.status === 'Cancelled');
        console.log('📋 Non-Trial package - showing Done + Scheduled + Cancelled');
      }
    }
    // If view is not 'customer' (i.e., trial page), return all visits as-is

    console.log('📊 Visits query result:', {
      total: visits.length,
      done: visits.filter(v => v.status === 'Done').length,
      scheduled: visits.filter(v => v.status === 'Scheduled').length,
      cancelled: visits.filter(v => v.status === 'Cancelled').length,
      filtered: filteredVisits.length,
      statuses: visits.map(v => ({ visitNumber: v.visitNumber, status: v.status, date: v.scheduledDate, updatedBy: v.updatedBy }))
    });

    return NextResponse.json({
      success: true,
      data: filteredVisits,
    });

  } catch (error) {
    console.error('Error fetching trial visits:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trial visits' },
      { status: 500 }
    );
  }
}

// POST - Add single trial visit
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

    const { id } = await params;
    const body = await request.json();
    const { trialDate, mitraId } = body;

    if (!trialDate || !mitraId) {
      return NextResponse.json(
        { success: false, message: 'Trial date and mitra are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(trialDate)) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Get customer info
    const customer = await db
      .select({
        id: customerDB.id,
        customerName: customerDB.customerName,
      })
      .from(customerDB)
      .where(eq(customerDB.id, id))
      .limit(1);

    if (customer.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Trial customer not found' },
        { status: 404 }
      );
    }

    // Verify mitra exists and is active
    const mitra = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        status: mitraDB.status,
      })
      .from(mitraDB)
      .where(eq(mitraDB.id, mitraId))
      .limit(1);

    if (mitra.length === 0 || mitra[0].status !== 'Active') {
      return NextResponse.json(
        { success: false, message: 'Selected mitra is not active or does not exist' },
        { status: 400 }
      );
    }

    // Get all existing visits to determine next visitNumber
    const existingVisits = await db
      .select()
      .from(visitDB)
      .where(eq(visitDB.customerId, id));

    const maxVisitNumber = existingVisits.length > 0
      ? Math.max(...existingVisits.map(v => v.visitNumber))
      : 0;

    // Calculate the day name from the trial date
    const trialDateObj = new Date(trialDate);
    const dayName = trialDateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Create single visit record
    const visitRecord = {
      customerId: id,
      mitraId: mitraId, // Kept for backward compatibility
      originalMitraId: mitraId, // Track original assignment
      actualMitraId: mitraId, // Initially same as original, can be changed later
      visitNumber: maxVisitNumber + 1,
      scheduledDate: trialDate,
      scheduledDay: dayName,
      status: 'Scheduled',
      durationHours: 3, // Default 3 hours for trial
    };

    await db.insert(visitDB).values([visitRecord]);

    console.log(`✅ Created trial visit #${visitRecord.visitNumber} for ${customer[0].customerName} on ${trialDate} with ${mitra[0].mitraName}`);

    return NextResponse.json({
      success: true,
      message: `Trial visit scheduled successfully for ${trialDate}`,
      data: {
        visit: visitRecord,
        visitNumber: visitRecord.visitNumber,
        mitraName: mitra[0].mitraName,
      },
    });

  } catch (error) {
    console.error('Error creating trial visits:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create trial visits' },
      { status: 500 }
    );
  }
}

// PUT - Update visit status/attendance
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

    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { visitId, status, actualDate, visitNotes, scheduledDate, scheduledDay, actualMitraId } = body;

    if (!visitId) {
      return NextResponse.json(
        { success: false, message: 'Visit ID is required' },
        { status: 400 }
      );
    }

    // Check if visit exists and get old data for audit
    const oldVisit = await db
      .select()
      .from(visitDB)
      .where(eq(visitDB.id, visitId))
      .limit(1);

    if (oldVisit.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Visit not found' },
        { status: 404 }
      );
    }

    // Check if completed visits should be locked (Feedback 6b)
    const lockCompletedVisits = await getConfig(CONFIG_KEYS.LOCK_COMPLETED_VISITS, false);

    if (lockCompletedVisits && oldVisit[0].status === 'Done' && scheduledDate) {
      return NextResponse.json(
        { success: false, message: 'Cannot edit date for completed visit (locked by admin)' },
        { status: 400 }
      );
    }

    // If lock is disabled, allow editing even for completed visits
    if (!lockCompletedVisits && oldVisit[0].status === 'Done') {
      console.log(`⚠️  Editing completed visit ${visitId} - lock is DISABLED (Feedback 6b)`);
    }

    const oldVisitData = oldVisit[0];

    // Update visit
    const updateData: any = {
      updatedAt: new Date(),
      updatedBy: session.email, // Record who made the update
    };

    if (status !== undefined) {
      updateData.status = status;
    }

    if (actualDate) {
      updateData.actualDate = actualDate;
    }

    if (status === 'Done') {
      updateData.completedAt = new Date();
    }

    if (visitNotes !== undefined) {
      updateData.visitNotes = visitNotes;
    }

    if (scheduledDate) {
      updateData.scheduledDate = scheduledDate;
      // Update scheduledDay based on new date (if not provided)
      if (scheduledDay) {
        updateData.scheduledDay = scheduledDay;
      } else {
        const date = new Date(scheduledDate);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        updateData.scheduledDay = dayName;
      }
    }

    if (actualMitraId) {
      updateData.actualMitraId = actualMitraId;
    }

    await db
      .update(visitDB)
      .set(updateData)
      .where(eq(visitDB.id, visitId));

    // Feature 8b: Detect payout adjustments needed when historical visits are edited
    try {
      const adjustments = await detectPayoutAdjustment({
        visitId,
        oldStatus: oldVisitData.status || 'Scheduled',
        newStatus: status !== undefined ? status : oldVisitData.status || 'Scheduled',
        oldMitraId: oldVisitData.mitraId,
        newMitraId: updateData.mitraId || oldVisitData.mitraId,
        oldActualMitraId: oldVisitData.actualMitraId,
        newActualMitraId: actualMitraId || oldVisitData.actualMitraId,
        userEmail: session.email,
      });

      if (adjustments && adjustments.length > 0) {
        await createPayoutAdjustments(adjustments);
        console.log(`📊 Created ${adjustments.length} payout adjustment(s) for visit ${visitId}`);
      }
    } catch (adjustmentError) {
      // Log error but don't fail the visit update
      console.error('Error creating payout adjustment:', adjustmentError);
    }

    // Log detailed audit
    const newVisitData = { ...oldVisitData, ...updateData };
    const changes = getChangedFields(oldVisitData, newVisitData);

    await logDetailedAudit({
      userId: session.userId,
      userEmail: session.email,
      action: 'UPDATE_VISIT',
      entityType: 'visit',
      entityId: visitId,
      oldValue: changes.old,
      newValue: changes.new,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    console.log(`✅ Updated visit ${visitId} to status: ${status} by ${session.email}`);

    return NextResponse.json({
      success: true,
      message: 'Visit updated successfully',
    });

  } catch (error) {
    console.error('Error updating visit:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update visit' },
      { status: 500 }
    );
  }
}
