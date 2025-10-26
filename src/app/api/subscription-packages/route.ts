import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import type { SubscriptionPackagesResponse, SubscriptionApiError } from '@/types/subscription';

export async function GET(request: NextRequest): Promise<NextResponse<SubscriptionPackagesResponse | SubscriptionApiError>> {
  try {
    console.log('Fetching subscription packages from database...');
    
    // Fetch all packages from database
    const result = await db
      .select({
        id: subscriptionPackageDB.id,
        subscriptionPackage: subscriptionPackageDB.subscriptionPackage,
        pricePerQty: subscriptionPackageDB.pricePerQty,
        priceNumeric: subscriptionPackageDB.priceNumeric,
        createdAt: subscriptionPackageDB.createdAt,
        updatedAt: subscriptionPackageDB.updatedAt,
      })
      .from(subscriptionPackageDB)
      .orderBy(subscriptionPackageDB.priceNumeric); // Order by price

    console.log(`Found ${result.length} subscription packages in database`);

    if (result.length === 0) {
      console.warn('No subscription packages found in database');
      return NextResponse.json({
        success: false,
        message: 'No subscription packages available',
      }, { status: 404 });
    }

    // Convert decimal fields to numbers for TypeScript compatibility
    const formattedResult = result.map(pkg => ({
      ...pkg,
      priceNumeric: parseFloat(pkg.priceNumeric.toString()),
    }));

    return NextResponse.json({
      success: true,
      data: formattedResult,
    });

  } catch (error) {
    console.error('Database error when fetching subscription packages:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
    
    return NextResponse.json({
      success: false,
      message: 'Failed to fetch subscription packages from database',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Database error',
    }, { status: 500 });
  }
}