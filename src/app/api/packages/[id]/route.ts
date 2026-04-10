import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB, customerDB } from '@/lib/schema';
import { eq, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT - Update subscription package
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

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin/Owner only' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { packageName, price, visitsPerWeek } = body;

    console.log(`[API PUT] Updating package ${id}:`, { packageName, price, visitsPerWeek });

    if (!packageName || price === undefined) {
      return NextResponse.json(
        { success: false, message: 'Package name and price are required' },
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

    // Validate visitsPerWeek (Bug #4 fix)
    const visits = visitsPerWeek !== undefined ? parseInt(visitsPerWeek) : 1;
    if (isNaN(visits) || visits < 0 || visits > 7) {
      return NextResponse.json(
        { success: false, message: 'Visits per week must be between 0 and 7' },
        { status: 400 }
      );
    }

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.id, id))
      .limit(1);

    if (existingPackage.length === 0) {
      console.error(`[API PUT] Package ${id} not found in DB`);
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      );
    }

    // Check if new package name conflicts with other packages
    if (packageName !== existingPackage[0].subscriptionPackage) {
      const conflict = await db
        .select()
        .from(subscriptionPackageDB)
        .where(eq(subscriptionPackageDB.subscriptionPackage, packageName))
        .limit(1);

      if (conflict.length > 0 && conflict[0].id !== id) {
        console.warn(`[API PUT] Conflict: Name "${packageName}" already exists elsewhere`);
        return NextResponse.json(
          { success: false, message: 'Package with this name already exists' },
          { status: 409 }
        );
      }
    }

    // Format price display
    const priceDisplay = `Rp ${priceNum.toLocaleString('id-ID')}`;

    console.log(`[API PUT] Performing DB update for ${id}...`);

    // Update package
    const updated = await db
      .update(subscriptionPackageDB)
      .set({
        subscriptionPackage: packageName,
        pricePerQty: priceDisplay,
        priceNumeric: priceNum.toFixed(2),
        visitsPerWeek: visits, // Bug #4 fix: Store frequency
        updatedAt: new Date(),
      })
      .where(eq(subscriptionPackageDB.id, id))
      .returning();

    if (!updated || updated.length === 0) {
      console.error(`[API PUT] DB Update returned empty result for ${id}`);
      return NextResponse.json(
        { success: false, message: 'Failed to update package - no rows affected' },
        { status: 500 }
      );
    }

    console.log(`✅ Updated subscription package: ${packageName} - ${priceDisplay}`);

    return NextResponse.json({
      success: true,
      message: 'Package updated successfully',
      data: updated[0]
    });

  } catch (error) {
    console.error('Error updating package:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update package' },
      { status: 500 }
    );
  }
}

// DELETE - Delete subscription package
export async function DELETE(
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

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Admin/Owner only' },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Check if package exists
    const existingPackage = await db
      .select()
      .from(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.id, id))
      .limit(1);

    if (existingPackage.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Package not found' },
        { status: 404 }
      );
    }

    // Check if package is being used by any customers
    const customersUsingPackage = await db
      .select({ count: sql<number>`count(*)` })
      .from(customerDB)
      .where(eq(customerDB.subscriptionPackageId, id));

    const customerCount = Number(customersUsingPackage[0]?.count) || 0;
    if (customerCount > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Cannot delete package. ${customerCount} customer(s) are currently using this package.`
        },
        { status: 409 }
      );
    }

    // Delete package
    await db
      .delete(subscriptionPackageDB)
      .where(eq(subscriptionPackageDB.id, id));

    console.log(`✅ Deleted subscription package: ${existingPackage[0].subscriptionPackage}`);

    return NextResponse.json({
      success: true,
      message: 'Package deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting package:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete package' },
      { status: 500 }
    );
  }
}
