import { NextResponse } from 'next/server';

// Mock data
const mockCustomers = [
  {
    id: '1',
    customerName: 'Handi Sulyansah',
    subscriptionPackage: 'Monthly Subscription of Regular Cleaning',
    subscriptionStatus: 'Active',
    monthlyFee: 1500000,
    city: 'Jakarta Selatan',
    createdAt: '2022-11-25T10:00:00Z',
    updatedAt: '2023-01-15T14:30:00Z'
  },
  {
    id: '2',
    customerName: 'Sarah Williams',
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning',
    subscriptionStatus: 'Active',
    monthlyFee: 2200000,
    city: 'Jakarta Selatan',
    createdAt: '2022-12-15T10:00:00Z',
    updatedAt: '2022-12-15T10:00:00Z'
  }
];

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      data: mockCustomers,
      items: mockCustomers,
      pagination: {
        page: 1,
        limit: 10,
        total: mockCustomers.length,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      page: 1,
      total: mockCustomers.length,
      totalPages: 1,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}