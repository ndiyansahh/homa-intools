import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visitDB, mitraDB, customerDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    id: string;
  }>;
}

// POST - Add single visit for customer
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
    const { visitDate, mitraId } = body;

    if (!visitDate || !mitraId) {
      return NextResponse.json(
        { success: false, message: 'Visit date and mitra are required' },
        { status: 400 }
      );
    }

    // Validate date format
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(visitDate)) {
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

    const maxVisitNumber = existingVisits.length > 0
      ? Math.max(...existingVisits.map(v => v.visitNumber))
      : 0;

    // Calculate the day name from the visit date
    const visitDateObj = new Date(visitDate);
    const dayName = visitDateObj.toLocaleDateString('en-US', { weekday: 'long' });

    // Create single visit record
    const visitRecord = {
      customerId: id,
      mitraId: mitraId, // Kept for backward compatibility
      originalMitraId: mitraId, // Track original assignment
      actualMitraId: mitraId, // Initially same as original, can be changed later
      visitNumber: maxVisitNumber + 1,
      scheduledDate: visitDate,
      scheduledDay: dayName,
      status: 'Done', // Default status changed to 'Done' per Chris request (Feb 1, 2026)

      // Auto-fill completion details for 'Done' status
      // FIX: Use scheduledDate for completedAt to ensure visits are counted in correct payout period
      // Issue: When creating visit in March for April schedule, completedAt was March (wrong payout month)
      actualDate: visitDate,
      completedAt: new Date(visitDate), // Use scheduled date instead of current time
      updatedBy: session.email || 'Admin',

      durationHours: 3, // Default 3 hours
    };

    await db.insert(visitDB).values([visitRecord]);

    console.log(`✅ Created visit #${visitRecord.visitNumber} for ${customer[0].customerName} on ${visitDate} with ${mitra[0].mitraName}`);

    return NextResponse.json({
      success: true,
      message: `Visit scheduled successfully for ${visitDate}`,
      data: {
        visit: visitRecord,
        visitNumber: visitRecord.visitNumber,
        mitraName: mitra[0].mitraName,
      },
    });

  } catch (error) {
    console.error('Error creating customer visit:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create customer visit' },
      { status: 500 }
    );
  }
}
