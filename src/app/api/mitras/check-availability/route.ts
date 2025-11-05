import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB, visitDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getMitraAvailabilityForPattern } from '@/lib/utils/subscriptionUtils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { dayPattern, startDate, endDate } = body;

    if (!dayPattern || !Array.isArray(dayPattern) || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Day pattern, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Fetch all active mitras
    const mitras = await db
      .select({
        id: mitraDB.id,
        mitraName: mitraDB.mitraName,
        contact: mitraDB.contact,
        status: mitraDB.status,
        totalVisits: mitraDB.totalVisits
      })
      .from(mitraDB)
      .where(eq(mitraDB.status, 'Active'));

    // Get all existing visits for availability calculation
    const existingVisits = await db
      .select({
        mitraId: visitDB.mitraId,
        scheduledDate: visitDB.scheduledDate,
        status: visitDB.status
      })
      .from(visitDB);

    // Check availability using utility function
    const availabilityResults = getMitraAvailabilityForPattern(
      dayPattern,
      new Date(startDate),
      new Date(endDate),
      mitras,
      existingVisits
    );

    const availableMitras = availabilityResults.filter(result => result.availableForAllDates);
    const unavailableMitras = availabilityResults
      .filter(result => !result.availableForAllDates)
      .map(result => ({
        mitraId: result.mitraId,
        mitraName: result.mitraName,
        reason: `Fully booked on: ${result.conflictDates?.join(', ')}`,
        conflictDates: result.conflictDates
      }));

    return NextResponse.json({
      success: true,
      data: {
        availableMitras,
        unavailableMitras,
        allMitras: availabilityResults
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