import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB } from '@/lib/schema';
import { sql, and, or, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(
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

    // Check RBAC - ADMIN/OWNER/STAFF can convert
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id: trialId } = await params;
    if (!trialId) {
      return NextResponse.json(
        { success: false, message: 'Trial ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if trial customer exists and is still in trial status
      const existingTrial = await db
        .select()
        .from(customerDB)
        .where(
          and(
            eq(customerDB.id, trialId),
            eq(customerDB.subscriptionStatus, 'Trial'),
            or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (existingTrial.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Trial customer not found or already converted' },
          { status: 404 }
        );
      }

      const trialCustomer = existingTrial[0];

      // Convert trial to customer by updating subscription status
      await db
        .update(customerDB)
        .set({
          subscriptionStatus: 'Converted', // New status indicating converted from trial
          monthlyFee: '150000', // Set appropriate monthly fee for converted customer
          customerNotes: `${trialCustomer.customerNotes || ''} - CONVERTED FROM TRIAL on ${new Date().toLocaleDateString('en-GB')}`,
          updatedAt: new Date(),
        })
        .where(eq(customerDB.id, trialId));

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'TRIAL_CONVERTED_TO_CUSTOMER',
          userId: session.userId,
          email: session.email,
          details: {
            customerId: trialId,
            customerName: trialCustomer.customerName,
            originalStatus: 'Trial',
            newStatus: 'Converted',
            convertedAt: new Date().toISOString(),
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Trial successfully converted to customer',
        data: {
          id: trialId,
          customerName: trialCustomer.customerName,
          originalStatus: 'Trial',
          newStatus: 'Converted',
          convertedAt: new Date().toISOString(),
        },
      });

    } catch (dbError) {
      console.error('Database error during trial conversion:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to convert trial - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Convert trial error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to convert trial' },
      { status: 500 }
    );
  }
}