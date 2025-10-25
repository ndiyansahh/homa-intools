import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { subscriptionPackageDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import type { SubscriptionPackagesResponse, SubscriptionApiError } from '@/types/subscription';

// Mock subscription packages data - matching new structure
const mockPackages = [
  {
    id: '1',
    subscriptionPackage: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
    pricePerQty: 'Rp1,125,000',
    priceNumeric: 1125000,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
    pricePerQty: 'Rp1,650,000',
    priceNumeric: 1650000,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '3',
    subscriptionPackage: 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)',
    pricePerQty: 'Rp562,500',
    priceNumeric: 562500,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '4',
    subscriptionPackage: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
    pricePerQty: 'Rp600,000',
    priceNumeric: 600000,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '5',
    subscriptionPackage: 'Trial',
    pricePerQty: 'Rp0',
    priceNumeric: 0,
    createdAt: new Date(),
    updatedAt: new Date()
  }
];

export async function GET(request: NextRequest): Promise<NextResponse<SubscriptionPackagesResponse | SubscriptionApiError>> {
  try {
    // Try database first
    const result = await db
      .select()
      .from(subscriptionPackageDB)
      .orderBy(subscriptionPackageDB.priceNumeric); // Order by price

    return NextResponse.json({
      success: true,
      data: result,
    });

  } catch (error) {
    console.error('Subscription packages API error, using mock data:', error);
    
    return NextResponse.json({
      success: true,
      data: mockPackages,
      message: 'Using mock data - database not connected',
    });
  }
}