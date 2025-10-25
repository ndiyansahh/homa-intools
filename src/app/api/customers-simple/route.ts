import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    data: [
      {
        id: '1',
        customerName: 'Handi Sulyansah',
        subscriptionPackage: 'Regular Cleaning',
        subscriptionStatus: 'Active',
        monthlyFee: 1500000,
        city: 'Jakarta Selatan',
        createdAt: '2022-11-25T10:00:00Z',
        updatedAt: '2023-01-15T14:30:00Z'
      }
    ],
    items: [
      {
        id: '1',
        customerName: 'Handi Sulyansah',
        subscriptionPackage: 'Regular Cleaning',
        subscriptionStatus: 'Active',
        monthlyFee: 1500000,
        city: 'Jakarta Selatan',
        createdAt: '2022-11-25T10:00:00Z',
        updatedAt: '2023-01-15T14:30:00Z'
      }
    ],
    page: 1,
    total: 1,
    totalPages: 1,
  });
}