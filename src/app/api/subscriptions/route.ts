import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, subscriptionPackageDB, visitDB, mitraDB } from '@/lib/schema';
import { createSubscriptionWithDayPattern } from '@/lib/utils/subscriptionUtils';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

// Create subscription with package-driven day pattern
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      customerId,
      subscriptionPackageId,
      dayPattern,
      subscriptionStartDate,
      mitraId
    } = body;

    // Validate required fields
    if (!customerId || !subscriptionPackageId || !subscriptionStartDate || !dayPattern || !mitraId) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: customerId, subscriptionPackageId, subscriptionStartDate, dayPattern, mitraId' },
        { status: 400 }
      );
    }

    try {
      // Use the utility function to create subscription
      const result = await createSubscriptionWithDayPattern(
        {
          customerId,
          subscriptionPackageId,
          dayPattern,
          subscriptionStartDate: new Date(subscriptionStartDate),
          mitraId
        },
        db,
        { customerDB, subscriptionPackageDB, visitDB, mitraDB }
      );

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'SUBSCRIPTION_CREATED',
          userId: session.userId,
          email: session.email,
          details: {
            customerId: result.subscriptionId,
            packageName: result.packageName,
            totalVisits: result.totalVisits,
            assignedMitraId: mitraId
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: `Subscription created with ${result.totalVisits} visits`,
        data: {
          subscriptionId: result.subscriptionId,
          totalVisits: result.totalVisits,
          packageName: result.packageName,
          subscriptionPeriod: result.subscriptionPeriod,
          dayPattern: result.dayPattern,
          scheduledDates: result.scheduledDates
        }
      });

    } catch (dbError) {
      console.error('Database error during subscription creation:', dbError);
      return NextResponse.json(
        { success: false, message: dbError instanceof Error ? dbError.message : 'Failed to create subscription - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error creating subscription:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create subscription' },
      { status: 500 }
    );
  }
}