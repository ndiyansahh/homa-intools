import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import type { SubscriptionPackagesResponse, SubscriptionApiError } from '@/types/subscription';

// Mock subscription packages data
const mockPackages = [
  {
    id: '1',
    packageName: 'Regular Cleaning - Standard',
    packageType: 'Regular',
    visitsPerWeek: 2,
    pricePerVisit: '50000',
    totalPrice: '400000',
    duration: 30,
    description: 'Standard regular cleaning service - 2 visits per week',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2', 
    packageName: 'Regular Cleaning - Premium',
    packageType: 'Regular',
    visitsPerWeek: 2,
    pricePerVisit: '65000',
    totalPrice: '520000',
    duration: 30,
    description: 'Premium regular cleaning service - 2 visits per week with extra care',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    packageName: 'Frequent Cleaning - Intensive',
    packageType: 'Frequent',
    visitsPerWeek: 3,
    pricePerVisit: '45000',
    totalPrice: '540000',
    duration: 30,
    description: 'Intensive frequent cleaning - 3 visits per week',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    packageName: 'Basic Cleaning - Economy',
    packageType: 'Basic',
    visitsPerWeek: 1,
    pricePerVisit: '40000',
    totalPrice: '160000',
    duration: 30,
    description: 'Basic economy cleaning service - 1 visit per week',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function GET(request: NextRequest): Promise<NextResponse<SubscriptionPackagesResponse | SubscriptionApiError>> {
  try {
    const { searchParams } = new URL(request.url);
    const packageType = searchParams.get('type');
    const active = searchParams.get('active');

    // Try database first
    let query = db
      .select()
      .from(subscriptionPackageDB)
      .$dynamic();

    if (packageType) {
      query = query.where(eq(subscriptionPackageDB.packageType, packageType));
    }

    if (active === 'true') {
      query = query.where(eq(subscriptionPackageDB.isActive, true));
    }

    const result = await query.orderBy(
      subscriptionPackageDB.packageType,
      subscriptionPackageDB.packageName
    );

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Subscription packages API error, using mock data:', error);
    
    // Filter mock data based on parameters
    let filteredData = [...mockPackages];
    
    if (packageType) {
      filteredData = filteredData.filter(pkg => pkg.packageType === packageType);
    }
    
    if (active === 'true') {
      filteredData = filteredData.filter(pkg => pkg.isActive);
    }
    
    return NextResponse.json({
      success: true,
      data: filteredData,
      message: 'Using mock data - database not connected',
    });
  }
}