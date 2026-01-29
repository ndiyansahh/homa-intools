import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { extractVisitsPerWeek } from '@/lib/utils/subscriptionUtils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const { id: packageId } = await params;

    // Fetch package details
    const packageResult = await db
      .select()
      .from(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.id, packageId))
      .limit(1);

    if (packageResult.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      );
    }

    const pkg = packageResult[0];
    const visitsPerWeek = extractVisitsPerWeek(pkg.subscriptionPackage);

    // Return package requirements
    const requirements = {
      packageId: pkg.id,
      packageName: pkg.subscriptionPackage,
      visitsPerWeek,
      requiredDays: visitsPerWeek, // Number of days user must select
      monthlyFee: pkg.priceNumeric,
      description: pkg.subscriptionPackage,
      isTrialPackage: pkg.subscriptionPackage.toLowerCase().includes('trial'),
      validationRules: {
        minDays: visitsPerWeek,
        maxDays: visitsPerWeek,
        allowDuplicateDays: true, // Allow customers to select the same day multiple times (e.g., Monday 08:00-11:00 & Monday 11:00-14:00)
        requireStartDate: !pkg.subscriptionPackage.toLowerCase().includes('trial')
      }
    };

    return NextResponse.json({
      success: true,
      data: requirements
    });

  } catch (error) {
    console.error('Error fetching package requirements:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch package requirements' },
      { status: 500 }
    );
  }
}