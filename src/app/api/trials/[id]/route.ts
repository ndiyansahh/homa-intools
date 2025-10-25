import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, regionDB, mitraDB } from '@/lib/schema';
import { sql, and, or, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { TrialDetail, TrialData } from '@/types/trial';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: { id: string };
}

// Helper function to calculate LTV in months using the formula: DATEDIF(start, end || today, "m")
function calculateLTV(trialStart: string, trialEnd?: string): number {
  try {
    // Parse dd/mm/yyyy format
    const [startDay, startMonth, startYear] = trialStart.split('/').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay);
    
    let endDate: Date;
    if (trialEnd) {
      const [endDay, endMonth, endYear] = trialEnd.split('/').map(Number);
      endDate = new Date(endYear, endMonth - 1, endDay + 1); // Add 1 day as per formula
    } else {
      endDate = new Date(); // Today's date
    }
    
    // Calculate difference in months
    const yearDiff = endDate.getFullYear() - startDate.getFullYear();
    const monthDiff = endDate.getMonth() - startDate.getMonth();
    const dayDiff = endDate.getDate() - startDate.getDate();
    
    let totalMonths = yearDiff * 12 + monthDiff;
    
    // If end day is before start day, subtract a month
    if (dayDiff < 0) {
      totalMonths -= 1;
    }
    
    return Math.max(0, totalMonths);
  } catch (error) {
    console.error('Error calculating LTV:', error);
    return 0;
  }
}

export async function GET(
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

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const trialId = params.id;
    if (!trialId) {
      return NextResponse.json(
        { success: false, message: 'Trial ID is required' },
        { status: 400 }
      );
    }

    try {
      // Get trial customer from customerDB with JOIN to mitraDB for cleaner information
      const trialResult = await db
        .select({
          id: customerDB.id,
          customerName: customerDB.customerName,
          address: customerDB.address,
          city: customerDB.city,
          district: customerDB.district,
          village: customerDB.village,
          postalCode: customerDB.postalCode,
          subscriptionPackage: customerDB.subscriptionPackage,
          subscriptionStart: customerDB.subscriptionStart,
          subscriptionEnd: customerDB.subscriptionEnd,
          subscriptionStatus: customerDB.subscriptionStatus,
          customerNotes: customerDB.customerNotes,
          assignedMitraId: customerDB.assignedMitraId,
          totalSessions: customerDB.totalSessions,
          chosenDays: customerDB.chosenDays,
          isActive: customerDB.isActive,
          isDeleted: customerDB.isDeleted,
          createdAt: customerDB.createdAt,
          updatedAt: customerDB.updatedAt,
          // JOIN mitraDB for cleaner names
          assignedMitraName: mitraDB.mitraName,
          assignedMitraStatus: mitraDB.status,
        })
        .from(customerDB)
        .leftJoin(mitraDB, eq(customerDB.assignedMitraId, mitraDB.id))
        .where(
          and(
            eq(customerDB.id, trialId),
            or(
              eq(customerDB.subscriptionStatus, 'Trial'),
              eq(customerDB.subscriptionStatus, 'Trial Scheduled')
            ),
            or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (trialResult.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Trial customer not found' },
          { status: 404 }
        );
      }

      const customer = trialResult[0];

      // Use assigned mitra from database JOIN instead of parsing customerNotes
      const assignedCleaner = customer.assignedMitraName || null;

      // Determine acquisition from customer notes or subscription
      const acquisition: 'HOMA' | 'Altrix' = 
        customer.customerNotes?.toLowerCase().includes('altrix') ? 'Altrix' : 'HOMA';

      // Determine residential type from subscription package or address
      let residentialType: 'House' | 'Office Space' | 'Apartment' = 'House';
      if (customer.subscriptionPackage?.toLowerCase().includes('office')) {
        residentialType = 'Office Space';
      } else if (customer.address?.toLowerCase().includes('apartment')) {
        residentialType = 'Apartment';
      }

      // Format trial start date from subscription start
      let trialStartFormatted = '';
      if (customer.subscriptionStart) {
        const date = new Date(customer.subscriptionStart);
        trialStartFormatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      }

      // Format trial end date from subscription end (if exists)
      let trialEndFormatted: string | undefined;
      if (customer.subscriptionEnd) {
        const date = new Date(customer.subscriptionEnd);
        trialEndFormatted = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
      }

      // Calculate LTV using the specified formula
      const ltv = trialStartFormatted ? calculateLTV(trialStartFormatted, trialEndFormatted) : 0;

      // Create assignment with new structure (trialStart/trialEnd instead of trialDate)
      const assignments = [];
      if (assignedCleaner && trialStartFormatted) {
        assignments.push({
          id: `${customer.id}_assignment`,
          trialStart: trialStartFormatted,
          trialEnd: trialEndFormatted,
          assignedCleaner,
          status: 'Not Converted' as const, // Default status for trials
          reasonForNotConverting: undefined,
          ltv,
        });
      }

      // Parse chosen days from JSON string
      let chosenDays: string[] = [];
      try {
        chosenDays = customer.chosenDays ? JSON.parse(customer.chosenDays) : [];
      } catch (e) {
        console.warn('Failed to parse chosenDays JSON:', customer.chosenDays);
        chosenDays = [];
      }

      // Use customer data
      const trialData: TrialData = {
        id: customer.id,
        customerName: customer.customerName,
        acquisition,
        address: customer.address,
        district: customer.district || '',
        city: customer.city,
        village: customer.village,
        postalCode: customer.postalCode || '',
        residentialType,
        assignedCleaner: assignedCleaner || null,
        assignedMitraId: customer.assignedMitraId || null, // Include mitra ID for editing
        assignments,
        notes: customer.customerNotes || '',
        subscriptionPackage: customer.subscriptionPackage || '',
        totalSessions: customer.totalSessions || 0,
        chosenDays: chosenDays,
        createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
        updatedAt: customer.updatedAt?.toISOString() || new Date().toISOString(),
        isDeleted: customer.isDeleted || false,
      };

      return NextResponse.json({
        success: true,
        data: trialData,
      });

    } catch (dbError) {
      console.error('Database error during trial detail fetch:', dbError);
      
      // Return a friendly error message
      return NextResponse.json(
        { success: false, message: 'Trial customer not found or database unavailable' },
        { status: 404 }
      );
    }

  } catch (error) {
    console.error('Get trial detail error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trial details' },
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
        { success: false, message: 'Forbidden - Only administrators can delete trials' },
        { status: 403 }
      );
    }

    const trialId = params.id;
    if (!trialId) {
      return NextResponse.json(
        { success: false, message: 'Trial ID is required' },
        { status: 400 }
      );
    }

    try {
      // Check if trial customer exists
      const existingCustomer = await db
        .select()
        .from(customerDB)
        .where(
          and(
            eq(customerDB.id, trialId),
            eq(customerDB.subscriptionStatus, 'Trial')
          )
        )
        .limit(1);

      if (existingCustomer.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Trial customer not found' },
          { status: 404 }
        );
      }

      // Soft delete trial customer
      await db
        .update(customerDB)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(eq(customerDB.id, trialId));

      // Log audit event
      if (session) {
        await logAuditEvent(session.userId, 'TRIAL_CUSTOMER_SOFT_DELETED', {
          customerId: trialId,
          customerName: existingCustomer[0].customerName,
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Trial customer soft deleted successfully',
      });

    } catch (dbError) {
      console.error('Database error during trial deletion:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to delete trial - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Delete trial error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to delete trial' },
      { status: 500 }
    );
  }
}