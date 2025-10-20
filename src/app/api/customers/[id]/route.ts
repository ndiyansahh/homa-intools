import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';
import type { CustomerData, CustomerApiError, UpdateCustomerRequest } from '@/types/customer';

// Mock customer data for development
const mockCustomersData: { [key: string]: CustomerData } = {
  '1': {
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
    status: 'Active',
    cleaner1: 'Ardi',
    cleaner2: 'Inem',
    churnTag: 'N/A',
    churnReason: '',
    createdAt: '2022-11-25T10:00:00Z',
    updatedAt: '2023-01-15T14:30:00Z',
    isDeleted: false,
  },
  '2': {
    id: '2',
    no: 2,
    customerName: 'Sarah Williams',
    acquisition: 'Altrix',
    contact: '628123456789',
    address: 'Jl. Sudirman No. 45',
    village: 'Karet',
    district: 'Setiabudi',
    city: 'Jakarta Selatan',
    postalCode: '12920',
    residentialType: 'Apartment',
    subscriptionPackage: 'Monthly Subscription of Frequent Cleaning (3 hours per visit; 3 visits per week)',
    qtyPackage: 2,
    ltv: 12,
    firstDateSubscription: '15/12/2022',
    status: 'Active',
    cleaner1: 'Siti',
    cleaner2: 'Budi',
    churnTag: 'N/A',
    churnReason: '',
    createdAt: '2022-12-15T10:30:00Z',
    updatedAt: '2022-12-15T10:30:00Z',
    isDeleted: false,
  },
  '3': {
    id: '3',
    no: 3,
    customerName: 'Michael Chen',
    acquisition: 'HOMA',
    contact: '628234567890',
    address: 'Komplek Villa Melati Mas',
    village: 'Serpong',
    district: 'Serpong Utara',
    city: 'Tangerang Selatan',
    postalCode: '15310',
    residentialType: 'House',
    subscriptionPackage: 'Monthly Subscription of Basic Cleaning (3 hours per visit; 1 visit per week)',
    qtyPackage: 1,
    ltv: 6,
    firstDateSubscription: '20/12/2022',
    status: 'Active',
    cleaner1: 'Ani',
    cleaner2: 'Dewi',
    churnTag: 'N/A',
    churnReason: '',
    createdAt: '2022-12-20T14:30:00Z',
    updatedAt: '2022-12-20T14:30:00Z',
    isDeleted: false,
  },
  '4': {
    id: '4',
    no: 4,
    customerName: 'Diana Rodriguez',
    acquisition: 'Altrix',
    contact: '628345678901',
    address: 'Gedung Perkantoran Thamrin',
    village: 'Menteng',
    district: 'Menteng',
    city: 'Jakarta Pusat',
    postalCode: '10310',
    residentialType: 'Office Space',
    subscriptionPackage: 'Monthly Subscription of Special Partnership (3 hours per visit; 1 visit per week)',
    qtyPackage: 1,
    ltv: 3,
    firstDateSubscription: '10/01/2023',
    status: 'Inactive',
    cleaner1: 'Rina',
    cleaner2: 'Tono',
    churnTag: 'External',
    churnReason: 'Pindah kantor',
    createdAt: '2023-01-10T11:20:00Z',
    updatedAt: '2023-06-15T16:00:00Z',
    isDeleted: false,
  },
};

interface RouteParams {
  params: { id: string };
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean; data?: CustomerData; message?: string } | CustomerApiError>> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const customerId = params.id;
    
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get customer with full details from database
      const result = await db
        .select()
        .from(customerDB)
        .where(
          and(
            eq(customerDB.id, customerId),
            or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (result.length === 0) {
        // Try mock data if customer not found in database
        const customerData = mockCustomersData[customerId];
        
        if (!customerData) {
          return NextResponse.json(
            { success: false, message: 'Customer not found' },
            { status: 404 }
          );
        }

        return NextResponse.json({
          success: true,
          data: customerData,
        });
      }

      const customer = result[0];
      
      // Format customer data from database
      const customerData: CustomerData = {
        id: customer.id,
        no: 1, // Default value since not in current schema
        customerName: customer.customerName,
        acquisition: 'HOMA', // Default value since not in current schema
        contact: customer.contact,
        address: customer.address,
        village: customer.village || '',
        district: customer.district || '',
        city: customer.city,
        postalCode: customer.postalCode || '',
        residentialType: 'House', // Default value since not in current schema
        subscriptionPackage: customer.subscriptionPackage || '',
        qtyPackage: 1, // Default value
        ltv: Number(customer.totalPaid) || 0,
        firstDateSubscription: customer.subscriptionStart ? new Date(customer.subscriptionStart).toLocaleDateString('en-GB') : '',
        status: customer.subscriptionStatus || 'Active',
        cleaner1: '', // Not in current schema
        cleaner2: '', // Not in current schema
        churnTag: customer.subscriptionStatus === 'Inactive' ? 'External' : 'N/A',
        churnReason: customer.customerNotes || '',
        createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: customer.updatedAt?.toISOString() || new Date().toISOString(),
        isDeleted: customer.isDeleted || false,
      };

      return NextResponse.json({
        success: true,
        data: customerData,
      });

    } catch (dbError) {
      console.error('Database error, using mock data:', dbError);
      
      // Get customer from mock data as fallback
      const customerData = mockCustomersData[customerId];
      
      if (!customerData) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: customerData,
        message: 'Using mock data - database error',
      });
    }

  } catch (error) {
    console.error('Customer detail API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch customer details',
        error: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - only ADMIN/OWNER can update
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const customerId = params.id;
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json() as UpdateCustomerRequest;

    try {
      // Check if customer exists
      const existingCustomer = await db
        .select()
        .from(customerDB)
        .where(
          and(
            eq(customerDB.id, customerId),
            or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (existingCustomer.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: 404 }
        );
      }

      // Build update object with only provided fields
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (body.customerName) updateData.customerName = body.customerName;
      if (body.contact) updateData.contact = body.contact;
      if (body.address) updateData.address = body.address;
      if (body.city) updateData.city = body.city;
      if (body.district) updateData.district = body.district;
      if (body.village) updateData.village = body.village;
      if (body.postalCode) updateData.postalCode = body.postalCode;
      if (body.subscriptionPackage) updateData.subscriptionPackage = body.subscriptionPackage;
      if (body.subscriptionStatus) updateData.subscriptionStatus = body.subscriptionStatus;
      if (body.monthlyFee !== undefined) updateData.monthlyFee = body.monthlyFee.toString();
      if (body.customerNotes) updateData.customerNotes = body.customerNotes;

      // Update customer
      await db
        .update(customerDB)
        .set(updateData)
        .where(eq(customerDB.id, customerId));

      // Log audit event
      if (session) {
        await logAuditEvent(session.userId, 'CUSTOMER_UPDATED', { customerId });
      }

      return NextResponse.json({
        success: true,
        message: 'Customer updated successfully',
      });

    } catch (dbError) {
      console.error('Database error during customer update:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to update customer - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Customer update API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update customer' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - only ADMIN can delete
    if (session && session.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Only administrators can delete customers' },
        { status: 403 }
      );
    }

    const customerId = params.id;
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const hardDelete = searchParams.get('hard') === 'true';

    try {
      // Check if customer exists
      const existingCustomer = await db
        .select()
        .from(customerDB)
        .where(eq(customerDB.id, customerId))
        .limit(1);

      if (existingCustomer.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: 404 }
        );
      }

      if (hardDelete) {
        // Hard delete - permanently remove from database
        await db
          .delete(customerDB)
          .where(eq(customerDB.id, customerId));

        // Log audit event
        if (session) {
          await logAuditEvent(session.userId, 'CUSTOMER_HARD_DELETED', { customerId });
        }

        return NextResponse.json({
          success: true,
          message: 'Customer permanently deleted',
        });
      } else {
        // Soft delete - mark as deleted
        await db
          .update(customerDB)
          .set({
            isDeleted: true,
            updatedAt: new Date(),
          })
          .where(eq(customerDB.id, customerId));

        // Log audit event
        if (session) {
          await logAuditEvent(session.userId, 'CUSTOMER_SOFT_DELETED', { customerId });
        }

        return NextResponse.json({
          success: true,
          message: 'Customer soft deleted successfully',
        });
      }

    } catch (dbError) {
      console.error('Database error during customer deletion:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete customer - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Customer delete API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete customer' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  return NextResponse.json({
    success: false,
    message: 'PUT method temporarily disabled for development'
  }, { status: 501 });
}