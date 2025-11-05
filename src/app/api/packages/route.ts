import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import { extractVisitsPerWeek } from '@/lib/utils/subscriptionUtils';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Fetch all subscription packages
    const packages = await db
      .select()
      .from(subscriptionPackageDB);

    // Remove duplicates by package name and transform to include visitsPerWeek calculation
    const uniquePackages = packages.reduce((acc, pkg) => {
      // Check if we already have this package name
      const existingIndex = acc.findIndex(existingPkg => 
        existingPkg.subscriptionPackage === pkg.subscriptionPackage
      );
      
      if (existingIndex === -1) {
        // New package, add it
        acc.push(pkg);
      } else {
        // Duplicate package name, keep the one with the most recent updatedAt
        if (pkg.updatedAt && (!acc[existingIndex].updatedAt || pkg.updatedAt > acc[existingIndex].updatedAt)) {
          acc[existingIndex] = pkg;
        }
      }
      
      return acc;
    }, [] as typeof packages);

    // Transform unique packages to include visitsPerWeek calculation
    const transformedPackages = uniquePackages.map(pkg => ({
      id: pkg.id,
      subscriptionPackage: pkg.subscriptionPackage,
      pricePerQty: pkg.pricePerQty,
      priceNumeric: pkg.priceNumeric,
      visitsPerWeek: extractVisitsPerWeek(pkg.subscriptionPackage),
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