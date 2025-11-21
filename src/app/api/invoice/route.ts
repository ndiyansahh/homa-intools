import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';
import { createInvoice, getInvoicesWithFullData, updateInvoicePayment } from '@/lib/utils/invoiceUtils';
import { db } from '@/lib/db';
import { invoiceDB } from '@/lib/schema';
import { eq, and, or, sql, count } from 'drizzle-orm';

/**
 * POST /api/invoice - Create a new invoice with auto-populated data
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    if (!body.customerId?.trim()) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    try {
      // Use the utility function to create invoice with populated data
      const result = await createInvoice({
        customerId: body.customerId,
        invoiceSequenceNumber: body.invoiceSequenceNumber || undefined,
        invoicePromoCode: body.invoicePromoCode || undefined,
        invoicePromoDiscount: body.invoicePromoDiscount || 0,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        paymentMethod: body.paymentMethod || undefined,
        notes: body.notes || undefined,
      });

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'INVOICE_CREATED',
          userId: session.userId,
          email: session.email,
          details: {
            invoiceId: result.id,
            invoiceNumber: result.invoiceNumber,
            customerName: result.invoiceCustomerName,
            totalAmount: result.totalAmount,
          }
        });
      }

      return NextResponse.json({ 
        success: true,
        data: result,
        message: 'Invoice created successfully with auto-populated data'
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error during invoice creation:', dbError);
      return NextResponse.json({ 
        success: false,
        error: `Failed to create invoice: ${(dbError as Error).message}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Create invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/invoice - Get invoices with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const customerId = searchParams.get('customerId');
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    try {
      // Use the utility function to get invoices with populated data
      const invoices = await getInvoicesWithFullData({
        customerId: customerId || undefined,
        status: status || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        limit: limit,
        offset: offset,
      });

      // Apply search filter if provided
      let filteredInvoices = invoices;
      if (q) {
        const searchTerm = q.toLowerCase();
        filteredInvoices = invoices.filter(invoice =>
          invoice.invoiceNumber.toLowerCase().includes(searchTerm) ||
          invoice.invoiceCustomerName.toLowerCase().includes(searchTerm) ||
          invoice.invoiceAddress.toLowerCase().includes(searchTerm) ||
          invoice.invoicePhoneNumber.toLowerCase().includes(searchTerm) ||
          invoice.invoicePromoCode?.toLowerCase().includes(searchTerm)
        );
      }

      // Get total count for pagination
      const totalResult = await db
        .select({ count: count() })
        .from(invoiceDB)
        .where(
          and(
            or(eq(invoiceDB.isDeleted, false), sql`${invoiceDB.isDeleted} IS NULL`),
            customerId ? eq(invoiceDB.customerId, customerId) : undefined,
            status ? eq(invoiceDB.status, status) : undefined
          )
        );

      const total = totalResult[0]?.count || 0;
      const totalPages = Math.ceil(total / limit);

      const response = {
        success: true,
        data: filteredInvoices,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
      };

      return NextResponse.json(response);

    } catch (dbError) {
      console.error('Database error during invoice retrieval:', dbError);
      return NextResponse.json({ 
        success: false,
        error: `Failed to retrieve invoices: ${(dbError as Error).message}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Get invoices error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/invoice - Update invoice payment status
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can update
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // Validation
    if (!body.invoiceId?.trim()) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    if (!body.status?.trim()) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 });
    }

    if (!['Paid', 'Overdue', 'Cancelled'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    try {
      // Update invoice payment status
      const result = await updateInvoicePayment(body.invoiceId, {
        status: body.status,
        paymentMethod: body.paymentMethod || undefined,
        paidAt: body.paidAt ? new Date(body.paidAt) : undefined,
        notes: body.notes || undefined,
      });

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'INVOICE_UPDATED',
          userId: session.userId,
          email: session.email,
          details: {
            invoiceId: result.id,
            invoiceNumber: result.invoiceNumber,
            newStatus: result.status,
          }
        });
      }

      return NextResponse.json({ 
        success: true,
        data: result,
        message: 'Invoice payment status updated successfully'
      });

    } catch (dbError) {
      console.error('Database error during invoice update:', dbError);
      return NextResponse.json({ 
        success: false,
        error: `Failed to update invoice: ${(dbError as Error).message}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Update invoice error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}