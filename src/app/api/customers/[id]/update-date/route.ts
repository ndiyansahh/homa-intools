import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: { id: string };
}
export async function POST(
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

    // Check RBAC - ADMIN/OWNER/STAFF can update dates
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

    const body = await request.json();
    const { newDate, endDate } = body;

    if (!newDate) {
      return NextResponse.json(
        { success: false, error: 'New date is required' },
        { status: 400 }
      );
    }

    // Validate date format (dd/MM/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(newDate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use dd/MM/yyyy' },
        { status: 400 }
      );
    }

    if (endDate && !dateRegex.test(endDate)) {
      return NextResponse.json(
        { success: false, error: 'Invalid end date format. Use dd/MM/yyyy' },
        { status: 400 }
      );
    }

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
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Convert dd/MM/yyyy to Date object
      const convertDateString = (dateStr: string): Date => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };

      const subscriptionStart = convertDateString(newDate);
      const subscriptionEnd = endDate ? convertDateString(endDate) : null;

      // Update customer subscription dates
      const updateData: any = {
        subscriptionStart: subscriptionStart.toISOString().split('T')[0], // Store as YYYY-MM-DD
        updatedAt: new Date(),
      };

      if (subscriptionEnd) {
        updateData.subscriptionEnd = subscriptionEnd.toISOString().split('T')[0];
      }

      await db
        .update(customerDB)
        .set(updateData)
        .where(eq(customerDB.id, customerId));

      // Log audit event
      if (session) {
        await logAuditEvent(session.userId, 'CUSTOMER_DATE_UPDATED', { 
          customerId, 
          newDate, 
          endDate: endDate || null 
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Date updated successfully',
      });

    } catch (dbError) {
      console.error('Database error during date update:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to update date - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Update date API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update date' },
      { status: 500 }
    );
  }
}