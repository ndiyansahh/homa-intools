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
      .orderBy(visitDB.visitNumber);

    // Filter visits based on view parameter and subscription package
    let filteredVisits = visits;
    if (view === 'customer') {
      const subscriptionPackage = visits[0]?.subscriptionPackage;
      const subscriptionStart = visits[0]?.subscriptionStart;

      if (subscriptionPackage === 'Trial') {
        // For Trial package in customer view: show ONLY Done visits
        filteredVisits = visits.filter(v => v.status === 'Done');
        console.log('🔒 Trial package - filtering to Done only');
      } else {
        // For Non-Trial (converted) packages in customer view:
        // Only show visits from subscriptionStart onwards to exclude old trial visits
        // Show Done + Scheduled + Cancelled
        filteredVisits = visits.filter(v => {
          const isValidStatus = v.status === 'Done' || v.status === 'Scheduled' || v.status === 'Cancelled';
          if (!isValidStatus) return false;
          // If subscriptionStart is set, only show visits on or after that date
          if (subscriptionStart && v.scheduledDate) {
            return v.scheduledDate >= subscriptionStart;
          }
          return true;
        });
        console.log('📋 Non-Trial package - showing visits from subscriptionStart onwards');
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
    const { trialDate, mitraId, startDate, endDate, selectedDay } = body;

    // Determine operation mode
    const isSingleVisit = trialDate && mitraId;
    const isBulkSchedule = startDate && selectedDay && mitraId;

    if (!isSingleVisit && !isBulkSchedule) {
      return NextResponse.json(
        { success: false, message: 'Invalid request. Provide trialDate for single visit, or startDate+selectedDay for bulk schedule.' },
        { status: 400 }
      );
    }

    if (isSingleVisit) {
      // Validate date format
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(trialDate)) {
        return NextResponse.json(
          { success: false, message: 'Invalid date format. Use YYYY-MM-DD' },
          { status: 400 }
        );
      }
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
        { success: false, message: 'Customer not found' },
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

    let maxVisitNumber = existingVisits.length > 0
      ? Math.max(...existingVisits.map(v => v.visitNumber))
      : 0;

    // HANDLE SINGLE VISIT (Trial/Manual Add)
    if (isSingleVisit) {
      // Calculate the day name from the trial date
      const trialDateObj = new Date(trialDate);
      const dayName = trialDateObj.toLocaleDateString('en-US', { weekday: 'long' });

      // Create single visit record
      const visitRecord = {
        customerId: id,
        mitraId: mitraId,
        originalMitraId: mitraId,
        actualMitraId: mitraId,
        visitNumber: maxVisitNumber + 1,
        scheduledDate: trialDate,
        scheduledDay: dayName,
        status: 'Done', // Feedback 13: Default to Done even for manual add
        completedAt: new Date(trialDate), // Auto-complete
        durationHours: 3,
      };

      await db.insert(visitDB).values([visitRecord]);

      console.log(`✅ Created single visit #${visitRecord.visitNumber} for ${customer[0].customerName} on ${trialDate}`);

      return NextResponse.json({
        success: true,
        message: `Visit scheduled successfully for ${trialDate}`,
        data: {
          visit: visitRecord,
        },
      });
    }

    // HANDLE BULK SCHEDULE (Feedback 13)
    if (isBulkSchedule) {
      console.log(`🔄 Generating bulk schedule for ${customer[0].customerName} from ${startDate}`);

      const start = new Date(startDate);
      const end = endDate
        ? new Date(endDate)
        : new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

      const visitDates: { date: Date; day: string }[] = [];
      const currentDate = new Date(start);

      while (currentDate <= end) {
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        if (dayName === selectedDay) {
          visitDates.push({
            date: new Date(currentDate),
            day: dayName
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (visitDates.length === 0) {
        return NextResponse.json(
          { success: false, message: `No ${selectedDay}s found in the selected date range.` },
          { status: 400 }
        );
      }

      const visitRecords = visitDates.map((visit, index) => ({
        customerId: id,
        mitraId: mitraId,
        originalMitraId: mitraId,
        actualMitraId: mitraId,
        visitNumber: maxVisitNumber + index + 1,
        scheduledDate: visit.date.toISOString().split('T')[0],
        scheduledDay: visit.day,
        status: 'Done', // Feedback 13: Default all generated visits to Done
        completedAt: visit.date, // Auto-complete
        durationHours: 3,
      }));

      await db.insert(visitDB).values(visitRecords);
      console.log(`✅ Bulk created ${visitRecords.length} visits for ${customer[0].customerName}`);

      return NextResponse.json({
        success: true,
        message: `Successfully scheduled ${visitRecords.length} visits`,
        data: {
          count: visitRecords.length,
          visits: visitRecords
        },
      });
    }

    // Fallback return (should be unreachable due to initial check)
    return NextResponse.json(
      { success: false, message: 'Invalid request state' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error creating visits:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create visits' },
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

    const { id: customerId } = await params;
    const body = await request.json();
    const { visitId, status, actualDate, visitNotes, scheduledDate, scheduledDay, actualMitraId, reschedule, newMitraId } = body;

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

    const oldVisitData = oldVisit[0];

    // ============================================================
    // RESCHEDULE MODE (Feedback Feb 1, 2026)
    // When reschedule=true: Cancel old visit + Create new visit with status Done
    // ============================================================
    if (reschedule && scheduledDate) {
      console.log(`🔄 Reschedule mode: Cancel old visit ${visitId} and create new visit`);

      // 1. Cancel old visit (mark as Cancelled = "not present")
      await db
        .update(visitDB)
        .set({
          status: 'Cancelled',
          visitNotes: `Rescheduled to ${scheduledDate}. ${oldVisitData.visitNotes || ''}`.trim(),
          updatedAt: new Date(),
          updatedBy: session.email,
        })
        .where(eq(visitDB.id, visitId));

      console.log(`❌ Cancelled old visit ${visitId}`);

      // 2. Get mitra info for new visit
      const mitraIdForNewVisit = newMitraId || actualMitraId || oldVisitData.actualMitraId || oldVisitData.mitraId;

      // 3. Get next visit number
      const existingVisits = await db
        .select()
        .from(visitDB)
        .where(eq(visitDB.customerId, customerId));

      const maxVisitNumber = existingVisits.length > 0
        ? Math.max(...existingVisits.map(v => v.visitNumber))
        : 0;

      // 4. Calculate day name from new date
      const newDateObj = new Date(scheduledDate);
      const dayName = newDateObj.toLocaleDateString('en-US', { weekday: 'long' });

      // 5. Create new visit with status Done (considered as "present")
      const newVisitRecord = {
        customerId: customerId,
        mitraId: mitraIdForNewVisit,
        originalMitraId: mitraIdForNewVisit,
        actualMitraId: mitraIdForNewVisit,
        visitNumber: maxVisitNumber + 1,
        scheduledDate: scheduledDate,
        scheduledDay: dayName,
        status: 'Done', // Auto-mark as present (Feedback 8a)
        completedAt: new Date(), // Set completedAt for payout (Feedback 9a)
        durationHours: oldVisitData.durationHours || 3,
        visitNotes: `Rescheduled from visit #${oldVisitData.visitNumber} (${oldVisitData.scheduledDate})`,
      };

      const [newVisit] = await db.insert(visitDB).values([newVisitRecord]).returning();

      console.log(`✅ Created new visit #${newVisitRecord.visitNumber} on ${scheduledDate} with status Done`);

      // 6. Log audit for reschedule
      await logDetailedAudit({
        userId: session.userId,
        userEmail: session.email,
        action: 'RESCHEDULE_VISIT',
        entityType: 'visit',
        entityId: visitId,
        oldValue: { visitId, scheduledDate: oldVisitData.scheduledDate, status: oldVisitData.status },
        newValue: { newVisitId: newVisit.id, scheduledDate, status: 'Done' },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json({
        success: true,
        message: `Visit rescheduled successfully. Old visit cancelled, new visit created for ${scheduledDate}`,
        data: {
          oldVisitId: visitId,
          newVisitId: newVisit.id,
          newVisitNumber: newVisitRecord.visitNumber,
        },
      });
    }

    // ============================================================
    // NORMAL UPDATE MODE (existing behavior)
    // ============================================================

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

