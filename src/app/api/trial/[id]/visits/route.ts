import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visitDB, mitraDB, customerDB, auditLogDB } from '@/lib/schema';
import { eq, and, or, sql, desc } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logDetailedAudit, getChangedFields } from '@/lib/audit-logger.server';

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
        // For Non-Trial packages in customer view: show Done + Scheduled
        filteredVisits = visits.filter(v => v.status === 'Done' || v.status === 'Scheduled');
        console.log('📋 Non-Trial package - showing Done + Scheduled');
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

// POST - Create/Update trial schedule and generate visits
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
    const { startDate, endDate, selectedDay, mitraId } = body;

    if (!startDate || !selectedDay || !mitraId) {
      return NextResponse.json(
        { success: false, message: 'Start date, selected day, and mitra are required' },
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

    // Generate visit dates based on selected day (e.g., every Monday)
    const visits: Date[] = [];
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

    const currentDate = new Date(start);
    while (currentDate <= end) {
      const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
      if (dayName === selectedDay) {
        visits.push(new Date(currentDate));
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Get existing completed visits to preserve them
    const existingCompletedVisits = await db
      .select()
      .from(visitDB)
      .where(
        and(
          eq(visitDB.customerId, id),
          eq(visitDB.status, 'Done')
        )
      );

    // Find the highest visitNumber from completed visits
    const maxVisitNumber = existingCompletedVisits.length > 0
      ? Math.max(...existingCompletedVisits.map(v => v.visitNumber))
      : 0;

    // Delete existing visits for this trial (only non-Done visits to preserve completed history)
    await db
      .delete(visitDB)
      .where(
        and(
          eq(visitDB.customerId, id),
          sql`${visitDB.status} != 'Done'`
        )
      );

    // Create new visit records starting from maxVisitNumber + 1
    const visitRecords = visits.map((visitDate, index) => ({
      customerId: id,
      mitraId: mitraId, // Kept for backward compatibility
      originalMitraId: mitraId, // Track original assignment
      actualMitraId: mitraId, // Initially same as original, can be changed later
      visitNumber: maxVisitNumber + index + 1,
      scheduledDate: visitDate.toISOString().split('T')[0],
      scheduledDay: selectedDay,
      status: 'Scheduled',
      durationHours: 3, // Default 3 hours for trial
    }));

    if (visitRecords.length > 0) {
      await db.insert(visitDB).values(visitRecords);

      // Update customer's assignedMitraId to match the visit schedule
      await db
        .update(customerDB)
        .set({
          assignedMitraId: mitraId,
          updatedAt: new Date(),
        })
        .where(eq(customerDB.id, id));

      console.log(`✅ Created ${visitRecords.length} new visit records for customer ${id}`);
      console.log(`✅ Preserved ${existingCompletedVisits.length} completed visit(s)`);
      console.log(`✅ Updated customer assignedMitraId to ${mitraId}`);
    }

    return NextResponse.json({
      success: true,
      message: `Successfully scheduled ${visitRecords.length} new visit(s). ${existingCompletedVisits.length} completed visit(s) preserved.`,
      data: {
        visitsCreated: visitRecords.length,
        visitsPreserved: existingCompletedVisits.length,
        visits: visitRecords,
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
    const { visitId, status, actualDate, visitNotes, scheduledDate } = body;

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

    if (oldVisit[0].status === 'Done' && scheduledDate) {
      return NextResponse.json(
        { success: false, message: 'Cannot edit date for completed visit' },
        { status: 400 }
      );
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
      // Update scheduledDay based on new date
      const date = new Date(scheduledDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      updateData.scheduledDay = dayName;
    }

    await db
      .update(visitDB)
      .set(updateData)
      .where(eq(visitDB.id, visitId));

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
