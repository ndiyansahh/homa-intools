import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { generateScheduleDates, extractVisitsPerWeek } from '@/lib/utils/subscriptionUtils';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { subscriptionPackageId, dayPattern, startDate, qtyPackage } = body;

    // Validate required fields
    if (!subscriptionPackageId || !dayPattern || !Array.isArray(dayPattern) || !startDate) {
      return NextResponse.json(
        { success: false, message: 'Package ID, day pattern, and start date are required' },
        { status: 400 }
      );
    }

    // Get package details
    const packageResult = await db
      .select()
      .from(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.id, subscriptionPackageId))
      .limit(1);

    if (packageResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      );
    }

    const pkg = packageResult[0];
    const visitsPerWeek = extractVisitsPerWeek(pkg.subscriptionPackage);

    // Calculate subscription period based on qtyPackage
    const months = qtyPackage && qtyPackage > 0 ? qtyPackage : 1;
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + months);
    end.setDate(end.getDate() - 1);

    // Generate visit schedule
    const scheduledDates = generateScheduleDates(start, end, dayPattern);

    // Transform to the expected format
    const scheduledVisits = scheduledDates.map((date, index) => ({
      visitNumber: index + 1,
      date: date.toISOString().split('T')[0],
      day: date.toLocaleDateString('en-US', { weekday: 'long' })
    }));

    const previewData = {
      visitsPerWeek,
      totalVisits: scheduledVisits.length,
      subscriptionPeriod: {
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0]
      },
      scheduledDates: scheduledVisits
    };

    return NextResponse.json({
      success: true,
      data: previewData
    });

  } catch (error) {
    console.error('Error generating subscription preview:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to generate subscription preview' },
      { status: 500 }
    );
  }
}