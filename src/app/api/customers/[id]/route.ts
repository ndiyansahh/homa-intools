import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, mitraDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logDetailedAudit, getChangedFields } from '@/lib/audit-logger.server';
import type { CustomerData, CustomerApiError, UpdateCustomerRequest } from '@/types/customer';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Parse a date string (YYYY-MM-DD or MM/DD/YYYY) safely without timezone shifts.
 * Returns DD/MM/YYYY format for display.
 */
function formatDateToEnGB(dateStr: string): string {
  if (!dateStr) return '';
  // Handle ISO format: YYYY-MM-DD
  const isoMatch = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
  }
  // Handle MM/DD/YYYY format
  const usMatch = dateStr.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (usMatch) {
    return `${usMatch[2]}/${usMatch[1]}/${usMatch[3]}`;
  }
  // Fallback to Date parsing
  return new Date(dateStr).toLocaleDateString('en-GB');
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse<{ success: boolean; data?: CustomerData; message?: string } | CustomerApiError>> {
  try {
    const session = await getSession();
    if (!session) {
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

    const { id: customerId } = await params;
    
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Get customer with specific fields from database, including mitra information
    const result = await db
      .select({
        customer: {
          id: customerDB.id,
          customerName: customerDB.customerName,
          contact: customerDB.contact,
          address: customerDB.address,
          city: customerDB.city,
          district: customerDB.district,
          village: customerDB.village,
          postalCode: customerDB.postalCode,
          assignedMitraId: customerDB.assignedMitraId,
          backupMitraId: customerDB.backupMitraId,
          invoiceId: customerDB.invoiceId,
          subscriptionPackage: customerDB.subscriptionPackage,
          subscriptionPackageId: customerDB.subscriptionPackageId,
          subscriptionStart: customerDB.subscriptionStart,
          subscriptionEnd: customerDB.subscriptionEnd,
          subscriptionStatus: customerDB.subscriptionStatus,
          qtyPackage: customerDB.qtyPackage,
          monthlyFee: customerDB.monthlyFee,
          totalPaid: customerDB.totalPaid,
          outstandingBalance: customerDB.outstandingBalance,
          customerNotes: customerDB.customerNotes,
          chosenDays: customerDB.chosenDays,
          dayPattern: customerDB.dayPattern,
          ltv: customerDB.ltv,
          churnTag: customerDB.churnTag,
          churnReason: customerDB.churnReason,
          isActive: customerDB.isActive,
          isDeleted: customerDB.isDeleted,
          createdAt: customerDB.createdAt,
          updatedAt: customerDB.updatedAt,
        },
        primaryMitra: {
          id: mitraDB.id,
          mitraName: mitraDB.mitraName,
        },
      })
      .from(customerDB)
      .leftJoin(mitraDB, eq(customerDB.assignedMitraId, mitraDB.id))
      .where(
        and(
          eq(customerDB.id, customerId),
          or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    // Check if customer exists in database
    if (result.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Customer not found' },
        { status: 404 }
      );
    }

    // Get backup mitra separately if exists
    let backupMitra = null;
    if (result[0].customer.backupMitraId) {
      const backupResult = await db
        .select({
          id: mitraDB.id,
          mitraName: mitraDB.mitraName,
        })
        .from(mitraDB)
        .where(eq(mitraDB.id, result[0].customer.backupMitraId))
        .limit(1);
      
      if (backupResult.length > 0) {
        backupMitra = backupResult[0];
      }
    }

    const customerRecord = result[0].customer;
    const primaryMitra = result[0].primaryMitra;
    
    const qtyPackage = customerRecord.qtyPackage || 1;
    
    // Format customer data from database - all dynamic values
    const customerData: CustomerData & { monthlyFee: number; invoiceId?: string } = {
      id: customerRecord.id,
      customerName: customerRecord.customerName,
      acquisition: 'HOMA', // Default - field doesn't exist in schema
      contact: customerRecord.contact,
      address: customerRecord.address,
      village: customerRecord.village || '',
      district: customerRecord.district || '',
      city: customerRecord.city,
      postalCode: customerRecord.postalCode || '',
      residentialType: 'House', // Default - field doesn't exist in schema
      subscriptionPackage: (customerRecord.subscriptionPackage as any) || 'Monthly Subscription of Regular Cleaning (3 hours per visit; 2 visits per week)',
      qtyPackage: qtyPackage,
      ltv: customerRecord.ltv || 0,
      monthlyFee: Number(customerRecord.monthlyFee) || 0,
      firstDateSubscription: customerRecord.subscriptionStart ? formatDateToEnGB(customerRecord.subscriptionStart) : '',
      subscriptionEnd: customerRecord.subscriptionEnd ? formatDateToEnGB(customerRecord.subscriptionEnd) : undefined,
      status: customerRecord.subscriptionStatus || 'Active',
      cleaner1: primaryMitra?.mitraName || '',
      cleaner2: backupMitra?.mitraName || '',
      churnTag: customerRecord.churnTag || '',
      churnReason: customerRecord.churnReason || '',
      createdAt: customerRecord.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: customerRecord.updatedAt?.toISOString() || new Date().toISOString(),
      isDeleted: customerRecord.isDeleted || false,
      invoiceId: customerRecord.invoiceId || undefined,
      // Renewal fields
      subscriptionPackageId: customerRecord.subscriptionPackageId || undefined,
      assignedMitraId: customerRecord.assignedMitraId || undefined,
      assignedMitraName: primaryMitra?.mitraName || undefined,
      dayPattern: customerRecord.dayPattern || undefined,
      subscriptionEndRaw: customerRecord.subscriptionEnd || undefined,
    };

    return NextResponse.json({
      success: true,
      data: customerData,
    });

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
    if (!session) {
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

    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json() as UpdateCustomerRequest;

    try {
      // Check if customer exists - fetch full record for audit logging
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

      const oldCustomerData = existingCustomer[0];

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
      if ((body as any).subscriptionStatus) updateData.subscriptionStatus = (body as any).subscriptionStatus;
      if ((body as any).subscriptionStart) updateData.subscriptionStart = (body as any).subscriptionStart;
      if ((body as any).monthlyFee !== undefined) updateData.monthlyFee = (body as any).monthlyFee.toString();
      if ((body as any).chosenDays) updateData.chosenDays = (body as any).chosenDays;
      if ((body as any).ltv !== undefined) updateData.ltv = Number((body as any).ltv);
      if ((body as any).customerNotes) updateData.customerNotes = (body as any).customerNotes;
      if ((body as any).churnTag !== undefined) updateData.churnTag = (body as any).churnTag;
      if ((body as any).churnReason !== undefined) updateData.churnReason = (body as any).churnReason;

      // Update customer
      await db
        .update(customerDB)
        .set(updateData)
        .where(eq(customerDB.id, customerId));

      // Create new data object for audit comparison
      const newCustomerData = { ...oldCustomerData, ...updateData };

      // Log detailed audit event with changed fields only
      if (session) {
        const changes = getChangedFields(oldCustomerData, newCustomerData);

        await logDetailedAudit({
          userId: session.userId,
          userEmail: session.email,
          action: 'UPDATE_CUSTOMER',
          entityType: 'customer',
          entityId: customerId,
          oldValue: changes.old,
          newValue: changes.new,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });
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
    if (!session) {
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

    const { id: customerId } = await params;
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
          await logDetailedAudit({
            userId: session.userId,
            userEmail: session.email,
            action: 'CUSTOMER_HARD_DELETED',
            entityType: 'customer',
            entityId: customerId,
            oldValue: { id: customerId },
            newValue: null,
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          });
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
          await logDetailedAudit({
            userId: session.userId,
            userEmail: session.email,
            action: 'CUSTOMER_SOFT_DELETED',
            entityType: 'customer',
            entityId: customerId,
            oldValue: { isDeleted: false },
            newValue: { isDeleted: true },
            ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          });
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
  try {
    const session = await getSession();
    if (!session) {
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

    const { id: customerId } = await params;
    if (!customerId) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();

    try {
      // Check if customer exists - fetch full record for audit logging
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

      const oldCustomerData = existingCustomer[0];

      // Build update object
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (body.customerName) updateData.customerName = body.customerName;
      if (body.contact) updateData.contact = body.contact;
      if (body.address) updateData.address = body.address;
      if (body.city) updateData.city = body.city;
      if (body.district !== undefined) updateData.district = body.district;
      if (body.village !== undefined) updateData.village = body.village;
      if (body.postalCode !== undefined) updateData.postalCode = body.postalCode;
      if (body.subscriptionPackage) updateData.subscriptionPackage = body.subscriptionPackage;
      if (body.status) updateData.subscriptionStatus = body.status;

      // Handle dates
      if (body.firstDateSubscription) {
        // Convert dd/MM/yyyy to yyyy-MM-dd for database
        const [day, month, year] = body.firstDateSubscription.split('/');
        updateData.subscriptionStart = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      if (body.subscriptionEnd) {
        const [day, month, year] = body.subscriptionEnd.split('/');
        updateData.subscriptionEnd = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }

      // Update customer
      await db
        .update(customerDB)
        .set(updateData)
        .where(eq(customerDB.id, customerId));

      // Create new data object for audit comparison
      const newCustomerData = { ...oldCustomerData, ...updateData };

      // Log detailed audit event with changed fields only
      if (session) {
        const changes = getChangedFields(oldCustomerData, newCustomerData);

        await logDetailedAudit({
          userId: session.userId,
          userEmail: session.email,
          action: 'UPDATE_CUSTOMER',
          entityType: 'customer',
          entityId: customerId,
          oldValue: changes.old,
          newValue: changes.new,
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
        });
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