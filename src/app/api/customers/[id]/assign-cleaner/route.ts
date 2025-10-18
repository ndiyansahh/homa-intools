import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { AssigneeCleanerRequest, CustomerData } from '@/types/customer';
import { logAuditEvent } from '@/lib/logger';

// Import customer data from main route - in production this would be from database
let customersData: CustomerData[] = [
  {
    id: '1',
    no: 1,
    customerName: 'Handi Sulyansah',
    acquisition: 'HOMA',
    contact: '62812916625948',
    address: '1 Park Residences',
    village: 'Gandaria',
    district: 'Kebayoran Baru',
    city: 'Jakarta Selatan',
    postalCode: '15148',
    residentialType: 'House',
    subscriptionPackage: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
    qtyPackage: 1,
    ltv: 4,
    firstDateSubscription: '25/11/2022',
    status: 'Churn',
    cleaner1: 'Ardi',
    cleaner2: 'Inem',
    churnTag: 'Internal',
    churnReason: 'okay',
    createdAt: '2022-11-25T10:00:00Z',
    updatedAt: '2023-01-15T14:30:00Z',
    isDeleted: false,
  },
  {
    id: '2',
    no: 2,
    customerName: 'Sarah Williams',
    acquisition: 'Altrix',
    contact: '6281234567890',
    address: 'Apartment 15B Green Tower',
    village: 'Senayan',
    district: 'Kebayoran Baru',
    city: 'Jakarta Selatan',
    postalCode: '12190',
    residentialType: 'Apartment',
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
    qtyPackage: 2,
    ltv: 8,
    firstDateSubscription: '15/12/2022',
    status: 'Active',
    cleaner1: 'Handi',
    cleaner2: 'Syeila',
    churnTag: 'N/A',
    createdAt: '2022-12-15T10:00:00Z',
    updatedAt: '2022-12-15T10:00:00Z',
    isDeleted: false,
  },
  {
    id: '3',
    no: 3,
    customerName: 'Michael Chen',
    acquisition: 'HOMA',
    contact: '6281987654321',
    address: 'Office Suite 501, Plaza Indonesia',
    village: 'Menteng',
    district: 'Menteng',
    city: 'Jakarta Pusat',
    postalCode: '10350',
    residentialType: 'Office Space',
    subscriptionPackage: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
    qtyPackage: 1,
    ltv: 12,
    firstDateSubscription: '20/12/2022',
    status: 'Active',
    cleaner1: 'Syeila',
    cleaner2: 'Imam',
    churnTag: 'N/A',
    createdAt: '2022-12-20T14:30:00Z',
    updatedAt: '2022-12-20T14:30:00Z',
    isDeleted: false,
  },
  {
    id: '4',
    no: 4,
    customerName: 'Diana Rodriguez',
    acquisition: 'Altrix',
    contact: '6281555666777',
    address: 'Rumah Cluster Paradise',
    village: 'Pondok Indah',
    district: 'Kebayoran Lama',
    city: 'Jakarta Selatan',
    postalCode: '12310',
    residentialType: 'House',
    subscriptionPackage: 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)',
    qtyPackage: 1,
    ltv: 6,
    firstDateSubscription: '10/01/2023',
    status: 'Churn',
    cleaner1: 'Ardi',
    cleaner2: '',
    churnTag: 'External',
    churnReason: 'Moved to different city',
    createdAt: '2023-01-10T11:20:00Z',
    updatedAt: '2023-06-15T16:00:00Z',
    isDeleted: false,
  },
];

// Available cleaners list
const availableCleaners = ['Handi', 'Syeila', 'Imam', 'Ardi', 'Inem'];

// POST /api/customers/[id]/assign-cleaner - Assign cleaners to customer
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can assign cleaners
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body: { cleaner1?: string; cleaner2?: string } = await request.json();

    const customerIndex = customersData.findIndex(c => c.id === id && !c.isDeleted);
    if (customerIndex === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Validation
    if (body.cleaner1 && !availableCleaners.includes(body.cleaner1)) {
      return NextResponse.json({ error: 'Invalid cleaner1 selection' }, { status: 400 });
    }

    if (body.cleaner2 && !availableCleaners.includes(body.cleaner2)) {
      return NextResponse.json({ error: 'Invalid cleaner2 selection' }, { status: 400 });
    }

    if (body.cleaner1 && body.cleaner2 && body.cleaner1 === body.cleaner2) {
      return NextResponse.json({ error: 'Cannot assign the same cleaner to both positions' }, { status: 400 });
    }

    // Store old values for audit log
    const oldCleaner1 = customersData[customerIndex].cleaner1;
    const oldCleaner2 = customersData[customerIndex].cleaner2;

    // Update the customer's cleaner assignments
    const updatedCustomer = {
      ...customersData[customerIndex],
      cleaner1: body.cleaner1 !== undefined ? body.cleaner1 : customersData[customerIndex].cleaner1,
      cleaner2: body.cleaner2 !== undefined ? body.cleaner2 : customersData[customerIndex].cleaner2,
      updatedAt: new Date().toISOString(),
    };

    customersData[customerIndex] = updatedCustomer;

    // Log audit event
    logAuditEvent({
      action: 'customer_cleaner_assigned',
      userId: session.userId,
      email: session.email,
      details: {
        customerId: updatedCustomer.id,
        customerName: updatedCustomer.customerName,
        oldCleaner1,
        oldCleaner2,
        newCleaner1: updatedCustomer.cleaner1,
        newCleaner2: updatedCustomer.cleaner2,
      },
    });

    return NextResponse.json({ 
      message: 'Cleaners assigned successfully',
      customer: updatedCustomer
    });
  } catch (error) {
    console.error('Assign cleaner error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/customers/[id]/assign-cleaner - Get available cleaners
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view cleaners
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json({ 
      availableCleaners,
      message: 'Available cleaners retrieved successfully'
    });
  } catch (error) {
    console.error('Get available cleaners error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}