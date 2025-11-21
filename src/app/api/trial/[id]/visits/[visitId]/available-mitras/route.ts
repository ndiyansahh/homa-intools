import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB, customerDB, visitDB } from '@/lib/schema';
import { eq, and, or, sql, ne } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

interface RouteParams {
  params: Promise<{
    id: string; // trial/customer id
    visitId: string;
  }>;
}

// GET - Get available mitras for a specific visit date with region filtering
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

    const { id, visitId } = await params;

    // Get visit details
    const visitResult = await db
      .select({
        id: visitDB.id,
        scheduledDate: visitDB.scheduledDate,
        scheduledDay: visitDB.scheduledDay,
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

    // Get customer location
    const customerResult = await db
      .select({
        city: customerDB.city,
        district: customerDB.district,
        village: customerDB.village,
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

    // Get all active mitras
    const allMitras = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        mitraCode: mitraDB.mitraCode,
        contact: mitraDB.contact,
        status: mitraDB.status,
        mitraCityAssignment: mitraDB.mitraCityAssignment,
        mitraLocationAssignment: mitraDB.mitraLocationAssignment,
      })
      .from(mitraDB)
      .where(eq(mitraDB.status, 'Active'));

    // Filter mitras by region coverage
    const regionFilteredMitras = allMitras.filter(mitra => {
      // Check city match first
      if (!mitra.mitraCityAssignment || mitra.mitraCityAssignment !== customer.city) {
        return false; // City must match exactly
      }

      // If no district assignment or no customer district, accept (city match is enough)
      if (!mitra.mitraLocationAssignment || !customer.district) {
        return true;
      }

      try {
        // mitraLocationAssignment is JSON array of districts
        const districts = typeof mitra.mitraLocationAssignment === 'string'
          ? JSON.parse(mitra.mitraLocationAssignment)
          : mitra.mitraLocationAssignment;

        // Check if mitra covers customer's district
        if (Array.isArray(districts)) {
          return districts.includes(customer.district);
        }

        return false;
      } catch (error) {
        console.warn(`Failed to parse location assignment for mitra ${mitra.id}:`, error);
        return false;
      }
    });

    // Get all visits on this date (exclude current visit)
    const visitsOnDate = await db
      .select({
        mitraId: visitDB.actualMitraId,
        status: visitDB.status,
        durationHours: visitDB.durationHours,
      })
      .from(visitDB)
      .where(and(
        eq(visitDB.scheduledDate, visit.scheduledDate),
        ne(visitDB.id, visitId),
        or(
          eq(visitDB.status, 'Scheduled'),
          eq(visitDB.status, 'Done')
        )
      ));

    // Calculate hours per mitra on this date
    const mitraHoursMap = new Map<string, number>();
    visitsOnDate.forEach(v => {
      if (v.mitraId) {
        const current = mitraHoursMap.get(v.mitraId) || 0;
        mitraHoursMap.set(v.mitraId, current + (v.durationHours || 3));
      }
    });

    // Filter by availability (max 8 hours per day)
    const MAX_HOURS_PER_DAY = 8;
    const availableMitras = regionFilteredMitras
      .map(mitra => {
        const currentHours = mitraHoursMap.get(mitra.id) || 0;
        const availableHours = MAX_HOURS_PER_DAY - currentHours;
        const isAvailable = availableHours >= 3; // Need at least 3 hours for a visit

        return {
          id: mitra.id,
          mitraName: mitra.mitraName,
          mitraCode: mitra.mitraCode,
          contact: mitra.contact,
          currentHours,
          availableHours,
          isAvailable,
        };
      })
      .filter(mitra => mitra.isAvailable); // Only return available mitras

    console.log(`Found ${availableMitras.length} available mitras for visit ${visitId} on ${visit.scheduledDate}`);
    console.log(`  Total region-matched: ${regionFilteredMitras.length}`);
    console.log(`  After availability filter: ${availableMitras.length}`);

    return NextResponse.json({
      success: true,
      data: {
        visitDate: visit.scheduledDate,
        visitDay: visit.scheduledDay,
        customerRegion: {
          city: customer.city,
          district: customer.district,
        },
        availableMitras,
        totalRegionMatched: regionFilteredMitras.length,
        totalAvailable: availableMitras.length,
      },
    });

  } catch (error) {
    console.error('Error fetching available mitras:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch available mitras' },
      { status: 500 }
    );
  }
}
