import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, regionDB, mitraDB, subscriptionPackageDB } from '@/lib/schema';
import { sql, and, or, ilike, eq, desc, count } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { CreateTrialRequest, TrialListItem, TrialsResponse, TrialData } from '@/types/trial';
import { logAuditEvent } from '@/lib/logger';

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

    const body: CreateTrialRequest = await request.json();

    // Validation
    if (!body.customerName?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Customer name is required' },
        { status: 400 }
      );
    }

    if (!body.address?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Address is required' },
        { status: 400 }
      );
    }

    if (!body.district?.trim()) {
      return NextResponse.json(
        { success: false, message: 'District is required' },
        { status: 400 }
      );
    }

    if (!body.city?.trim()) {
      return NextResponse.json(
        { success: false, message: 'City is required' },
        { status: 400 }
      );
    }

    if (!body.postalCode?.trim()) {
      return NextResponse.json(
        { success: false, message: 'Postal code is required' },
        { status: 400 }
      );
    }

    if (!body.assignments || body.assignments.length === 0) {
      return NextResponse.json(
        { success: false, message: 'At least one trial assignment is required' },
        { status: 400 }
      );
    }

    // Validate date format (dd/MM/yyyy) for all assignments
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    for (const assignment of body.assignments) {
      if (!dateRegex.test(assignment.trialStart)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid trial start date format. Use dd/MM/yyyy format'
        }, { status: 400 });
      }
      if (assignment.trialEnd && !dateRegex.test(assignment.trialEnd)) {
        return NextResponse.json({
          success: false,
          message: 'Invalid trial end date format. Use dd/MM/yyyy format'
        }, { status: 400 });
      }
      if (!assignment.assignedCleaner?.trim()) {
        return NextResponse.json(
          { success: false, message: 'Assigned cleaner is required for each trial' },
          { status: 400 }
        );
      }
    }

    try {
      // Get Trial subscription package from database
      const trialPackageResult = await db
        .select()
        .from(subscriptionPackageDB)
        .where(eq(subscriptionPackageDB.subscriptionPackage, 'Trial'))
        .limit(1);

      if (trialPackageResult.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Trial subscription package not found in database' },
          { status: 500 }
        );
      }

      const trialPackage = trialPackageResult[0];
      console.log('Using Trial package for trials route:', {
        id: trialPackage.id,
        name: trialPackage.subscriptionPackage,
        pricePerQty: trialPackage.pricePerQty,
        priceNumeric: trialPackage.priceNumeric
      });

      // Convert dd/MM/yyyy to Date object for database storage
      const convertDateString = (dateStr: string): Date => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };

      // Use first assignment for trial dates
      const firstAssignment = body.assignments[0];
      const trialStartDate = convertDateString(firstAssignment.trialStart);
      const trialEndDate = firstAssignment.trialEnd ? convertDateString(firstAssignment.trialEnd) : null;

      // Create trial customer in customerDB with Trial package from database
      const trialCustomerData = {
        customerName: body.customerName.trim(),
        contact: '628000000000', // Default contact for trials
        address: body.address.trim(),
        district: body.district.trim(),
        city: body.city.trim(),
        postalCode: body.postalCode.trim(),
        village: body.village || '', // Optional field
        subscriptionPackageId: trialPackage.id, // Link to Trial package
        subscriptionPackage: trialPackage.subscriptionPackage, // 'Trial'
        subscriptionStart: trialStartDate.toISOString().split('T')[0], // Store as YYYY-MM-DD
        subscriptionEnd: trialEndDate ? trialEndDate.toISOString().split('T')[0] : null,
        subscriptionStatus: 'Trial',
        monthlyFee: '0', // Free trial
        customerNotes: `${body.notes || ''} - ${body.acquisition} acquisition - Residential: ${body.residentialType} - Assigned cleaner: ${firstAssignment.assignedCleaner}`,
        isDeleted: false,
      };

      const result = await db
        .insert(customerDB)
        .values(trialCustomerData)
        .returning({ id: customerDB.id });

      const newTrialId = result[0]?.id;

      if (!newTrialId) {
        return NextResponse.json(
          { success: false, message: 'Failed to create trial customer' },
          { status: 500 }
        );
      }

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'TRIAL_CUSTOMER_CREATED',
          userId: session.userId,
          email: session.email,
          details: {
            customerId: newTrialId,
            customerName: body.customerName.trim(),
            trialStartDate: firstAssignment.trialStart,
            trialEndDate: firstAssignment.trialEnd,
            assignedCleaner: firstAssignment.assignedCleaner,
          }
        });
      }

      return NextResponse.json({
        success: true,
        data: { id: newTrialId },
        message: 'Trial customer created successfully',
      }, { status: 201 });

    } catch (dbError: any) {
      console.error('Database error during trial creation:', dbError);
      console.error('Error details:', {
        code: dbError.code,
        message: dbError.message,
        detail: dbError.detail,
        hint: dbError.hint,
        position: dbError.position,
        table: dbError.table,
        column: dbError.column,
        constraint: dbError.constraint,
        severity: dbError.severity,
        stack: dbError.stack
      });
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to create trial - database error',
          error: process.env.NODE_ENV === 'development' ? dbError.message : undefined,
          details: process.env.NODE_ENV === 'development' ? {
            code: dbError.code,
            detail: dbError.detail,
            hint: dbError.hint
          } : undefined
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Create trial error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create trial' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
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

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const cleaner = searchParams.get('cleaner') || '';
    const acquisition = searchParams.get('acquisition') || '';
    const city = searchParams.get('city') || '';
    const residentialType = searchParams.get('residentialType') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    let trials: TrialListItem[] = [];
    let total = 0;

    try {
      // Build where conditions for trial customers from customerDB  
      const conditions = [];

      // Only show customers with Trial Scheduled status (fallback to Trial for existing data)
      conditions.push(
        or(
          eq(customerDB.subscriptionStatus, 'Trial Scheduled'),
          eq(customerDB.subscriptionStatus, 'Trial')
        )
      );

      // Search in customer name, address, or district
      if (q) {
        conditions.push(
          or(
            ilike(customerDB.customerName, `%${q}%`),
            ilike(customerDB.address, `%${q}%`),
            ilike(customerDB.district, `%${q}%`)
          )
        );
      }

      // Filter by city
      if (city) {
        conditions.push(ilike(customerDB.city, `%${city}%`));
      }

      // Add soft delete condition (only show non-deleted customers)
      conditions.push(or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count first
      const countResult = await db
        .select({ count: count() })
        .from(customerDB)
        .where(whereClause);
      
      total = countResult[0]?.count || 0;

      // Get trial customers with LEFT JOIN to mitraDB for cleaner information
      const trialCustomers = await db
        .select({
          id: customerDB.id,
          customerName: customerDB.customerName,
          city: customerDB.city,
          district: customerDB.district,
          village: customerDB.village,
          postalCode: customerDB.postalCode,
          subscriptionStatus: customerDB.subscriptionStatus,
          customerNotes: customerDB.customerNotes,
          assignedMitraId: customerDB.assignedMitraId,
          createdAt: customerDB.createdAt,
          isDeleted: customerDB.isDeleted,
          // JOIN mitraDB for cleaner names
          assignedMitraName: mitraDB.mitraName,
          assignedMitraStatus: mitraDB.status,
        })
        .from(customerDB)
        .leftJoin(mitraDB, eq(customerDB.assignedMitraId, mitraDB.id))
        .where(whereClause)
        .orderBy(desc(customerDB.createdAt))
        .limit(limit)
        .offset(offset);

      console.log('Drizzle query successful, found', trialCustomers.length, 'results');
      
      // Convert customer data to trial list format
      trials = trialCustomers.map((customer) => {
        // Determine acquisition from customer notes
        const acquisition: 'HOMA' | 'Altrix' = 
          customer.customerNotes?.toLowerCase().includes('altrix') ? 'Altrix' : 'HOMA';
        
        // Infer residential type from subscription package or address (database column not yet migrated)
        let residentialType: 'House' | 'Office Space' | 'Apartment' = 'House';
        if ((customer as any).subscriptionPackage?.toLowerCase().includes('office')) {
          residentialType = 'Office Space';
        } else if ((customer as any).address?.toLowerCase().includes('apartment')) {
          residentialType = 'Apartment';
        }

        // Format trial start date from subscription start
        let nextTrialStartDate: string | undefined;
        if ((customer as any).subscriptionStart) {
          const date = new Date((customer as any).subscriptionStart);
          nextTrialStartDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }

        // Format trial end date from subscription end
        let nextTrialEndDate: string | undefined;
        if ((customer as any).subscriptionEnd) {
          const date = new Date((customer as any).subscriptionEnd);
          nextTrialEndDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }

        // Calculate LTV (with error handling)
        let ltv = 0;
        try {
          ltv = nextTrialStartDate ? calculateLTV(nextTrialStartDate, nextTrialEndDate) : 0;
        } catch (ltvError) {
          console.warn('Error calculating LTV:', ltvError);
          ltv = 0;
        }

        // Use assigned mitra from database JOIN instead of parsing customerNotes
        const assignedCleaners: string[] = [];
        if (customer.assignedMitraName && customer.assignedMitraStatus === 'Active') {
          assignedCleaners.push(customer.assignedMitraName);
        }

        return {
          id: customer.id,
          customerName: customer.customerName,
          acquisition,
          district: customer.district || '',
          city: customer.city,
          village: customer.village || undefined,
          residentialType,
          nextTrialStartDate,
          nextTrialEndDate,
          assignedCleaners,
          assignedMitraId: customer.assignedMitraId || undefined, // Include mitra ID for editing
          overallStatus: 'Not Converted' as const, // Default trial status
          ltv,
          createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
          isDeleted: customer.isDeleted || false,
        };
      });

    } catch (dbError) {
      console.error('Database error during trials fetch:', dbError);
      console.error('Database error details:', {
        message: (dbError as any)?.message,
        code: (dbError as any)?.code,
        table: (dbError as any)?.table,
        column: (dbError as any)?.column,
        stack: (dbError as any)?.stack
      });
      
      // Return empty results with friendly message
      return NextResponse.json({
        success: true,
        data: [],
        items: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
        page: 1,
        total: 0,
        totalPages: 0,
        message: 'Unable to fetch trials at this time',
      });
    }

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: trials,
      items: trials,
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
      message: trials.length === 0 && total === 0 ? 'No trials found' : undefined,
    });

  } catch (error) {
    console.error('Get trials error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch trials' },
      { status: 500 }
    );
  }
}