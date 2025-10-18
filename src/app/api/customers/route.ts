import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CreateCustomerRequest, CustomerListItem, CustomersResponse, CustomerData } from '@/types/customer';
import { logAuditEvent } from '@/lib/logger';

// Mock data storage (replace with real database)
// Some data populated from TrialDatabase as per PRD requirements
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

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateCustomerRequest = await request.json();

    // Validation
    if (!body.customerName?.trim()) {
      return NextResponse.json({ error: 'Customer name is required' }, { status: 400 });
    }

    if (!body.contact?.trim()) {
      return NextResponse.json({ error: 'Contact is required' }, { status: 400 });
    }

    if (!body.address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!body.city?.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }

    // Validate date format (dd/MM/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(body.firstDateSubscription)) {
      return NextResponse.json({ 
        error: 'Invalid subscription date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    // Check customer name uniqueness
    if (customersData.some(c => c.customerName.toLowerCase() === body.customerName.toLowerCase() && !c.isDeleted)) {
      return NextResponse.json({ error: 'Customer name already exists' }, { status: 400 });
    }

    const nextNo = Math.max(...customersData.map(c => c.no), 0) + 1;

    const newCustomer: CustomerData = {
      id: Date.now().toString(),
      no: nextNo,
      customerName: body.customerName.trim(),
      acquisition: body.acquisition,
      contact: body.contact.trim(),
      address: body.address.trim(),
      village: body.village.trim(),
      district: body.district.trim(),
      city: body.city.trim(),
      postalCode: body.postalCode.trim(),
      residentialType: body.residentialType,
      subscriptionPackage: body.subscriptionPackage,
      qtyPackage: body.qtyPackage,
      ltv: body.ltv,
      firstDateSubscription: body.firstDateSubscription,
      status: body.status.trim(),
      cleaner1: body.cleaner1.trim(),
      cleaner2: body.cleaner2?.trim() || '',
      churnTag: body.churnTag,
      churnReason: body.churnReason?.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    customersData.push(newCustomer);

    // Log audit event
    logAuditEvent({
      action: 'customer_created',
      userId: session.userId,
      email: session.email,
      details: {
        customerId: newCustomer.id,
        customerName: newCustomer.customerName,
        acquisition: newCustomer.acquisition,
      },
    });

    return NextResponse.json({ id: newCustomer.id }, { status: 201 });
  } catch (error) {
    console.error('Create customer error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const acquisition = searchParams.get('acquisition') || '';
    const status = searchParams.get('status') || '';
    const churnTag = searchParams.get('churnTag') || '';
    const city = searchParams.get('city') || '';
    const residentialType = searchParams.get('residentialType') || '';
    const subscriptionPackage = searchParams.get('subscriptionPackage') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter customers (exclude soft deleted by default)
    let filteredCustomers = customersData.filter(customer => !customer.isDeleted);

    // Apply search filters
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredCustomers = filteredCustomers.filter(customer =>
        customer.customerName.toLowerCase().includes(searchTerm) ||
        customer.address.toLowerCase().includes(searchTerm) ||
        customer.contact.includes(searchTerm)
      );
    }

    if (acquisition) {
      filteredCustomers = filteredCustomers.filter(customer => customer.acquisition === acquisition);
    }

    if (status) {
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.status.toLowerCase().includes(status.toLowerCase())
      );
    }

    if (churnTag) {
      filteredCustomers = filteredCustomers.filter(customer => customer.churnTag === churnTag);
    }

    if (city) {
      filteredCustomers = filteredCustomers.filter(customer => 
        customer.city.toLowerCase().includes(city.toLowerCase())
      );
    }

    if (residentialType) {
      filteredCustomers = filteredCustomers.filter(customer => customer.residentialType === residentialType);
    }

    if (subscriptionPackage) {
      filteredCustomers = filteredCustomers.filter(customer => customer.subscriptionPackage === subscriptionPackage);
    }

    // Sort by creation date (newest first)
    filteredCustomers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Convert to list items with 5 key fields as per PRD
    const items: CustomerListItem[] = filteredCustomers.map(customer => ({
      id: customer.id,
      customerName: customer.customerName,
      qtyPackage: customer.qtyPackage,
      subscriptionPackage: customer.subscriptionPackage,
      status: customer.status,
      churnTag: customer.churnTag,
    }));

    // Pagination
    const total = items.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = items.slice(offset, offset + limit);

    const response: CustomersResponse = {
      items: paginatedItems,
      page,
      total,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get customers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}