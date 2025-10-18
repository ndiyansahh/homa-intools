import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { UpdateCustomerRequest, CustomerData, UpdateDateRequest, AssigneeCleanerRequest } from '@/types/customer';
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

// GET /api/customers/[id] - Get individual customer details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const customer = customersData.find(c => c.id === id && !c.isDeleted);

    if (!customer) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error('Get customer details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/customers/[id] - Update customer
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can update
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const body: Partial<UpdateCustomerRequest> = await request.json();

    const customerIndex = customersData.findIndex(c => c.id === id && !c.isDeleted);
    if (customerIndex === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Validate date format if date is being updated
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (body.firstDateSubscription && !dateRegex.test(body.firstDateSubscription)) {
      return NextResponse.json({ 
        error: 'Invalid subscription date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    // Check customer name uniqueness if name is being updated
    if (body.customerName && body.customerName !== customersData[customerIndex].customerName) {
      if (customersData.some(c => c.customerName.toLowerCase() === body.customerName!.toLowerCase() && c.id !== id && !c.isDeleted)) {
        return NextResponse.json({ error: 'Customer name already exists' }, { status: 400 });
      }
    }

    // Update the customer
    const updatedCustomer = {
      ...customersData[customerIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    customersData[customerIndex] = updatedCustomer;

    // Log audit event
    logAuditEvent({
      action: 'customer_updated',
      userId: session.userId,
      email: session.email,
      details: {
        customerId: updatedCustomer.id,
        customerName: updatedCustomer.customerName,
        updatedFields: Object.keys(body),
      },
    });

    return NextResponse.json({ 
      id: updatedCustomer.id,
      message: 'Customer updated successfully' 
    });
  } catch (error) {
    console.error('Update customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/customers/[id] - Soft delete customer
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can delete
    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;
    const customerIndex = customersData.findIndex(c => c.id === id && !c.isDeleted);

    if (customerIndex === -1) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    // Soft delete
    customersData[customerIndex] = {
      ...customersData[customerIndex],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    // Log audit event
    logAuditEvent({
      action: 'customer_deleted',
      userId: session.userId,
      email: session.email,
      details: {
        customerId: customersData[customerIndex].id,
        customerName: customersData[customerIndex].customerName,
      },
    });

    return NextResponse.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    console.error('Delete customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}