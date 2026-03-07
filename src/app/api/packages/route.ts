import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import { extractVisitsPerWeek } from '@/lib/utils/subscriptionUtils';
import { getSession } from '@/lib/auth';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

// GET - Fetch all subscription packages
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Fetch all subscription packages
    const packages = await db
      .select()
      .from(subscriptionPackageDB)
      .orderBy(subscriptionPackageDB.priceNumeric);

    // Transform packages to include visitsPerWeek from database
    const transformedPackages = packages.map(pkg => ({
      id: pkg.id,
      subscriptionPackage: pkg.subscriptionPackage,
      pricePerQty: pkg.pricePerQty,
      priceNumeric: parseFloat(pkg.priceNumeric.toString()),
      visitsPerWeek: pkg.visitsPerWeek ?? extractVisitsPerWeek(pkg.subscriptionPackage), // Bug #4 fix: Read from DB column, fallback to parsing
      packageName: pkg.subscriptionPackage, // For compatibility
      description: `${pkg.subscriptionPackage} - ${pkg.pricePerQty}`,
      createdAt: pkg.createdAt,
      updatedAt: pkg.updatedAt
    }));

    return NextResponse.json({
      success: true,
      data: transformedPackages
    });

  } catch (error) {
    console.error('Error fetching packages:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch packages' },
      { status: 500 }
    );
  }
}

// POST - Create new subscription package
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin/Owner only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { packageName, price, visitsPerWeek } = body;

    // Allow price to be 0
    if (!packageName || price === undefined || price === null) {
      return NextResponse.json(
        { success: false, message: 'Package name and price are required' },
        { status: 400 }
      );
    }

    // Validate visitsPerWeek (Bug #4 fix)
    const visits = visitsPerWeek !== undefined ? parseInt(visitsPerWeek) : 1;
    if (isNaN(visits) || visits < 0 || visits > 7) {
      return NextResponse.json(
        { success: false, message: 'Visits per week must be between 0 and 7' },
        { status: 400 }
      );
    }

    // Validate price is a positive number
    const priceNum = parseFloat(price);
    if (isNaN(priceNum) || priceNum < 0) {
      return NextResponse.json(
        { success: false, message: 'Price must be a positive number' },
        { status: 400 }
      );
    }

    // Check if package name already exists
    const existing = await db
      .select()
      .from(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.subscriptionPackage, packageName))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { success: false, message: 'Package with this name already exists' },
        { status: 409 }
      );
    }

    // Format price display
    const priceDisplay = `Rp ${priceNum.toLocaleString('id-ID')}`;

    // Create new package
    const newPackage = await db
      .insert(subscriptionPackageDB)
      .values({
        subscriptionPackage: packageName,
        pricePerQty: priceDisplay,
        priceNumeric: priceNum.toFixed(2),
        visitsPerWeek: visits, // Bug #4 fix: Store frequency
      })
      .returning();

    console.log(`✅ Created new subscription package: ${packageName} - ${priceDisplay}`);

    return NextResponse.json({
      success: true,
      message: 'Package created successfully',
      data: newPackage[0]
    });

  } catch (error) {
    console.error('Error creating package:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create package' },
      { status: 500 }
    );
  }
}