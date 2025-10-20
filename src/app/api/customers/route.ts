import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB } from '@/lib/schema';
import { sql, and, or, ilike, eq, desc, count } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';
import type { CustomerListItem, CustomersResponse, CustomerApiError, CreateCustomerRequest } from '@/types/customer';

// Mock data for customers - matching detail data exactly
const mockCustomers: CustomerListItem[] = [
  {
    id: '1',
    customerName: 'Handi Sulyansah',
    subscriptionPackage: 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
    subscriptionStatus: 'Active',
    monthlyFee: 1500000,
    city: 'Jakarta Selatan',
    createdAt: '2022-11-25T10:00:00Z',
    updatedAt: '2023-01-15T14:30:00Z'
  },
  {
    id: '2',
    customerName: 'Sarah Williams',
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
    subscriptionStatus: 'Active',
    monthlyFee: 2200000,
    city: 'Jakarta Selatan',
    createdAt: '2022-12-15T10:30:00Z',
    updatedAt: '2022-12-15T10:30:00Z'
  },
  {
    id: '3',
    customerName: 'Michael Chen',
    subscriptionPackage: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
    subscriptionStatus: 'Active',
    monthlyFee: 900000,
    city: 'Tangerang Selatan',
    createdAt: '2022-12-20T14:30:00Z',
    updatedAt: '2022-12-20T14:30:00Z'
  },
  {
    id: '4',
    customerName: 'Diana Rodriguez',
    subscriptionPackage: 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)',
    subscriptionStatus: 'Inactive',
    monthlyFee: 750000,
    city: 'Jakarta Pusat',
    createdAt: '2023-01-10T11:20:00Z',
    updatedAt: '2023-06-15T16:00:00Z'
  },
];

export async function GET(request: NextRequest): Promise<NextResponse<CustomersResponse | CustomerApiError>> {
  try {
    const session = await getSession();
    
    // For development, allow access without session or return mock data if needed
    if (!session && process.env.NODE_ENV === 'development') {
      console.log('No session found, using mock data for development');
      // Skip auth in development and continue with mock data fallback below
    } else if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    } else if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;
    
    // Filter parameters
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const city = searchParams.get('city') || '';
    const subscriptionPackage = searchParams.get('subscriptionPackage') || '';

    // Try database first
    let customers: CustomerListItem[] = [];
    let total = 0;

    try {
      // Build where conditions
      const conditions = [];
      
      // Search in customer name, address, or contact
      if (search) {
        conditions.push(
          or(
            ilike(customerDB.customerName, `%${search}%`),
            ilike(customerDB.address, `%${search}%`),
            ilike(customerDB.contact, `%${search}%`)
          )
        );
      }
      
      // Status filter - map to subscriptionStatus
      if (status) {
        conditions.push(ilike(customerDB.subscriptionStatus, `%${status}%`));
      }
      
      // City filter
      if (city) {
        conditions.push(ilike(customerDB.city, `%${city}%`));
      }
      
      // Subscription package filter
      if (subscriptionPackage) {
        conditions.push(ilike(customerDB.subscriptionPackage, `%${subscriptionPackage}%`));
      }
      
      // Add soft delete condition (only show non-deleted customers)
      conditions.push(or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`));
      
      // Exclude only active Trial customers - Converted trials should appear here
      conditions.push(sql`${customerDB.subscriptionStatus} != 'Trial' OR ${customerDB.subscriptionStatus} IS NULL`);

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(customerDB)
        .where(whereClause);
      
      total = countResult[0]?.count || 0;

      // Get paginated customers from database
      const result = await db
        .select({
          id: customerDB.id,
          customerName: customerDB.customerName,
          subscriptionPackage: customerDB.subscriptionPackage,
          subscriptionStatus: customerDB.subscriptionStatus,
          monthlyFee: customerDB.monthlyFee,
          city: customerDB.city,
          createdAt: customerDB.createdAt,
          updatedAt: customerDB.updatedAt,
        })
        .from(customerDB)
        .where(whereClause)
        .orderBy(desc(customerDB.createdAt))
        .limit(limit)
        .offset(offset);

      customers = result.map(customer => ({
        id: customer.id,
        customerName: customer.customerName,
        subscriptionPackage: customer.subscriptionPackage || '',
        subscriptionStatus: customer.subscriptionStatus,
        monthlyFee: Number(customer.monthlyFee) || 0,
        city: customer.city,
        createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: customer.updatedAt?.toISOString() || new Date().toISOString(),
      }));

    } catch (dbError) {
      console.error('Database error, using mock data:', dbError);
      
      // Filter mock data based on parameters
      // First exclude Trial customers - they should appear in /app/trial instead
      let filteredData = mockCustomers.filter(customer => customer.subscriptionStatus !== 'Trial');
      
      if (search) {
        const searchTerm = search.toLowerCase();
        filteredData = filteredData.filter(customer => 
          customer.customerName.toLowerCase().includes(searchTerm)
        );
      }
      
      if (status) {
        filteredData = filteredData.filter(customer => 
          customer.subscriptionStatus.toLowerCase().includes(status.toLowerCase())
        );
      }
      
      if (city) {
        filteredData = filteredData.filter(customer => 
          customer.city.toLowerCase().includes(city.toLowerCase())
        );
      }
      
      if (subscriptionPackage) {
        filteredData = filteredData.filter(customer => 
          customer.subscriptionPackage.toLowerCase().includes(subscriptionPackage.toLowerCase())
        );
      }
      
      total = filteredData.length;
      customers = filteredData.slice(offset, offset + limit);
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: customers,
      items: customers,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      page,
      total,
      totalPages,
      message: customers.length === 0 && total === 0 ? 'No customers found' : undefined,
    });

  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch customers',
        error: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
      } as any,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const body = await request.json() as CreateCustomerRequest;

    // Validate required fields
    if (!body.customerName || !body.contact || !body.address || !body.city) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: customerName, contact, address, city' },
        { status: 400 }
      );
    }

    try {
      // Create customer in database
      const customerData = {
        customerName: body.customerName,
        contact: body.contact,
        address: body.address,
        city: body.city,
        district: body.district || null,
        village: body.village || null,
        postalCode: body.postalCode || null,
        subscriptionPackage: body.subscriptionPackage || null,
        subscriptionStart: body.subscriptionStart ? new Date(body.subscriptionStart) : null,
        subscriptionEnd: body.subscriptionEnd ? new Date(body.subscriptionEnd) : null,
        subscriptionStatus: body.subscriptionStatus || 'Active',
        monthlyFee: body.monthlyFee ? body.monthlyFee.toString() : '0',
        totalPaid: '0',
        outstandingBalance: body.monthlyFee ? body.monthlyFee.toString() : '0',
        customerNotes: body.customerNotes || null,
        isActive: true,
        isDeleted: false,
      };

      const result = await db
        .insert(customerDB)
        .values(customerData)
        .returning({ id: customerDB.id });

      const newCustomerId = result[0]?.id;

      // Log audit event
      if (session) {
        await logAuditEvent(session.userId, 'CUSTOMER_CREATED', { customerId: newCustomerId });
      }

      return NextResponse.json({
        success: true,
        data: { id: newCustomerId, ...customerData },
        message: 'Customer created successfully',
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error during customer creation:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to create customer - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Customer creation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create customer' },
      { status: 500 }
    );
  }
}