import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB, visitDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getMitraAvailabilityForPattern } from '@/lib/utils/subscriptionUtils';
import { getConfig, CONFIG_KEYS } from '@/lib/config';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { dayPattern, startDate, endDate, city, district } = body;

    if (!dayPattern || !Array.isArray(dayPattern) || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Day pattern, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Fetch all active mitras with coverage area info
    const allMitras = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        contact: mitraDB.contact,
        status: mitraDB.status,
        totalVisits: mitraDB.totalVisits,
        mitraCityAssignment: mitraDB.mitraCityAssignment,
        mitraLocationAssignment: mitraDB.mitraLocationAssignment
      })
      .from(mitraDB)
      .where(eq(mitraDB.status, 'Active'));

    // Check if region filter is enabled (Feedback 2a)
    const enableRegionFilter = await getConfig(CONFIG_KEYS.ENABLE_MITRA_REGION_FILTER, false);

    // Filter mitras by coverage area if city and district provided AND filter is enabled
    let mitras = allMitras;
    if (city && district && enableRegionFilter) {
      console.log(`🔍 Region filter ENABLED - Filtering mitras for coverage area: ${city} - ${district}`);
      mitras = allMitras.filter((mitra) => {
        // Check city match
        if (mitra.mitraCityAssignment !== city) return false;

        // Check district in locationAssignment array
        try {
          const districts = JSON.parse(mitra.mitraLocationAssignment || '[]');
          return districts.includes(district);
        } catch (e) {
          console.error('Error parsing mitraLocationAssignment for mitra:', mitra.id, e);
          return false;
        }
      });
      console.log(`✅ Filtered from ${allMitras.length} to ${mitras.length} mitras based on coverage`);
    } else if (city && district && !enableRegionFilter) {
      console.log(`⚠️  Region filter DISABLED - Returning all ${allMitras.length} active mitras (ignoring city/district)`);
    }

    // Get all existing visits for availability calculation
    const existingVisits = await db
      .select({
        mitraId: visitDB.mitraId,
        scheduledDate: visitDB.scheduledDate,
        status: visitDB.status
      })
      .from(visitDB);

    // Feature flag: Enable schedule checking
    // When false (default): All mitras available, no workload restrictions (totally free assignment)
    // When true: Enforce 8-hour daily limit, check for conflicts
    const enableScheduleCheck = process.env.ENABLE_MITRA_SCHEDULE_CHECK === 'true';

    // Check availability using utility function
    const availabilityResults = getMitraAvailabilityForPattern(
      dayPattern,
      new Date(startDate),
      new Date(endDate),
      mitras,
      existingVisits
    );

    // Toggle behavior based on feature flag (Feedback: Remove mitra assignment restrictions)
    let availableMitras: any[] = [];
    let unavailableMitras: any[] = [];

    if (enableScheduleCheck) {
      // Restricted mode: Separate available vs unavailable based on workload
      availableMitras = availabilityResults.filter(result => result.availableForAllDates);
      unavailableMitras = availabilityResults
        .filter(result => !result.availableForAllDates)
        .map(result => ({
          mitraId: result.mitraId,
          mitraName: result.mitraName,
          reason: `Fully booked on: ${result.conflictDates?.join(', ')}`,
          conflictDates: result.conflictDates
        }));
    } else {
      // Free assignment mode: All mitras available
      console.log(`✅ ENABLE_MITRA_SCHEDULE_CHECK=false: Returning all ${mitras.length} mitras as available (no workload check)`);
      availableMitras = availabilityResults.map(result => ({
        mitraId: result.mitraId,
        mitraName: result.mitraName,
        contact: result.contact,
        availableForAllDates: true, // Force all available
        totalSessionsNeeded: result.totalSessionsNeeded,
        wouldHaveHours: result.wouldHaveHours
      }));
      unavailableMitras = []; // No unavailable mitras in free mode
    }

    return NextResponse.json({
      success: true,
      data: {
        availableMitras,
        unavailableMitras,
        allMitras: availabilityResults,
        totalMitrasBeforeFilter: allMitras.length,
        totalMitrasAfterCoverageFilter: mitras.length,
        coverageFilterApplied: city && district && enableRegionFilter ? true : false,
        coverageFilterEnabled: enableRegionFilter,
        scheduleCheckEnabled: enableScheduleCheck, // NEW: Schedule check toggle status
      }
    });

  } catch (error) {
    console.error('Error checking mitra availability:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check mitra availability' },
      { status: 500 }
    );
  }
}