import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB, customerDB, visitDB } from '@/lib/schema';
import { eq, and, or, sql, ne } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { getConfig, CONFIG_KEYS } from '@/lib/config';

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
    console.log('🔍 [available-mitras] Starting request...');
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
    console.log('🔍 [available-mitras] Params:', { customerId: id, visitId });

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
      console.log('❌ [available-mitras] Visit not found');
      return NextResponse.json(
        { success: false, message: 'Visit not found' },
        { status: 404 }
      );
    }

    const visit = visitResult[0] as { id: string; scheduledDate: string | Date; scheduledDay: string };
    console.log('✅ [available-mitras] Visit found:', visit);

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
      console.log('❌ [available-mitras] Customer not found');
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    const customer = customerResult[0];
    console.log('✅ [available-mitras] Customer found:', customer);

    // Get all active mitras
    console.log('🔍 [available-mitras] Fetching active mitras...');
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

    console.log(`✅ [available-mitras] Found ${allMitras.length} active mitras`);

    // Check if region filter is enabled (Feedback 2a)
    // Disabled per client feedback Feb 1 2026 - No strict area limitation
    // const enableRegionFilter = await getConfig(CONFIG_KEYS.ENABLE_MITRA_REGION_FILTER, false);
    const enableRegionFilter = false;

    // Filter mitras by region coverage (only if enabled)
    let regionFilteredMitras = allMitras;

    if (enableRegionFilter) {
      console.log(`🔍 Region filter ENABLED - Filtering mitras for ${customer.city} - ${customer.district}`);
      regionFilteredMitras = allMitras.filter(mitra => {
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
      console.log(`✅ Filtered from ${allMitras.length} to ${regionFilteredMitras.length} mitras based on region`);
    } else {
      console.log(`⚠️  Region filter DISABLED - Using all ${allMitras.length} active mitras`);
    }

    // Get all visits on this date (exclude current visit)
    console.log('🔍 [available-mitras] Querying visits on date:', visit.scheduledDate);

    // Convert date to string format for comparison (YYYY-MM-DD)
    const scheduledDateStr = typeof visit.scheduledDate === 'object' && visit.scheduledDate !== null && 'toISOString' in visit.scheduledDate
      ? (visit.scheduledDate as Date).toISOString().split('T')[0]
      : String(visit.scheduledDate);

    console.log('🔍 [available-mitras] Date string for query:', scheduledDateStr);

    const visitsOnDate = await db
      .select({
        mitraId: visitDB.actualMitraId,
        status: visitDB.status,
        durationHours: visitDB.durationHours,
      })
      .from(visitDB)
      .where(and(
        sql`${visitDB.scheduledDate}::text = ${scheduledDateStr}`,
        ne(visitDB.id, visitId),
        or(
          eq(visitDB.status, 'Scheduled'),
          eq(visitDB.status, 'Done')
        )
      ));

    console.log(`✅ [available-mitras] Found ${visitsOnDate.length} visits on this date`);

    // Calculate hours per mitra on this date
    const mitraHoursMap = new Map<string, number>();
    visitsOnDate.forEach(v => {
      if (v.mitraId) {
        const current = mitraHoursMap.get(v.mitraId) || 0;
        mitraHoursMap.set(v.mitraId, current + (v.durationHours || 3));
      }
    });

    // Check if max hours restriction is enabled (Feedback 2b)
    // Disabled per client feedback Mar 7 2026 - No schedule restriction
    // const enableMaxHours = await getConfig(CONFIG_KEYS.ENABLE_SCHEDULE_MAX_HOURS, false);
    const enableMaxHours = false;

    // Filter by availability (max 8 hours per day - only if enabled)
    const MAX_HOURS_PER_DAY = 8;
    const mitraWithAvailability = regionFilteredMitras.map(mitra => {
      const currentHours = mitraHoursMap.get(mitra.id) || 0;
      const availableHours = MAX_HOURS_PER_DAY - currentHours;
      const isAvailable = enableMaxHours
        ? availableHours >= 3 // Need at least 3 hours for a visit (if restriction enabled)
        : true; // Always available if restriction disabled

      return {
        id: mitra.id,
        mitraId: mitra.id, // Alias for frontend compatibility
        mitraName: mitra.mitraName,
        mitraCode: mitra.mitraCode,
        contact: mitra.contact,
        currentHours,
        availableHours,
        availableSlots: Math.floor(availableHours / 3), // Calculated slots (3 hours per slot)
        isAvailable,
      };
    });

    const availableMitras = enableMaxHours
      ? mitraWithAvailability.filter(mitra => mitra.isAvailable) // Filter if restriction enabled
      : mitraWithAvailability; // Return all if restriction disabled

    if (enableMaxHours) {
      console.log(`🕐 Max hours restriction ENABLED - Filtered to ${availableMitras.length} mitras with available hours`);
    } else {
      console.log(`⚠️  Max hours restriction DISABLED - All ${availableMitras.length} mitras available (no hour limit)`);
    }

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
        // NEW: Toggle status
        filters: {
          regionFilterEnabled: enableRegionFilter,
          maxHoursEnabled: enableMaxHours,
        },
      },
    });

  } catch (error) {
    console.error('❌ [available-mitras] ERROR:', error);
    console.error('❌ [available-mitras] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch available mitras',
        error: 'Internal server error'
      },
      { status: 500 }
    );
  }
}
