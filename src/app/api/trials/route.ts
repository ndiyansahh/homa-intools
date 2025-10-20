import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, regionDB } from '@/lib/schema';
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
      // Convert dd/MM/yyyy to Date object for database storage
      const convertDateString = (dateStr: string): Date => {
        const [day, month, year] = dateStr.split('/');
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      };

      // Use first assignment for trial dates
      const firstAssignment = body.assignments[0];
      const trialStartDate = convertDateString(firstAssignment.trialStart);
      const trialEndDate = firstAssignment.trialEnd ? convertDateString(firstAssignment.trialEnd) : null;

      // Determine trial package based on assigned cleaner
      let trialPackage = 'Trial Package - Basic Cleaning (1 visit)';
      if (firstAssignment.assignedCleaner.toLowerCase().includes('office')) {
        trialPackage = 'Trial Package - Office Cleaning (1 visit)';
      }

      // Create trial customer in customerDB
      const trialCustomerData = {
        customerName: body.customerName.trim(),
        contact: '628000000000', // Default contact for trials
        address: body.address.trim(),
        district: body.district.trim(),
        city: body.city.trim(),
        postalCode: body.postalCode.trim(),
        village: '', // Optional field
        residentialType: body.residentialType, // Store the residential type from request
        subscriptionPackage: trialPackage,
        subscriptionStart: trialStartDate.toISOString().split('T')[0], // Store as YYYY-MM-DD
        subscriptionEnd: trialEndDate ? trialEndDate.toISOString().split('T')[0] : null,
        subscriptionStatus: 'Trial',
        monthlyFee: '0', // Free trial
        customerNotes: `${body.notes || ''} - ${body.acquisition} acquisition - Assigned cleaner: ${firstAssignment.assignedCleaner}`,
        village: body.village || '',
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
        await logAuditEvent(session.userId, 'TRIAL_CUSTOMER_CREATED', {
          customerId: newTrialId,
          customerName: body.customerName.trim(),
          trialStartDate: firstAssignment.trialStart,
          trialEndDate: firstAssignment.trialEnd,
          assignedCleaner: firstAssignment.assignedCleaner,
        });
      }

      return NextResponse.json({
        success: true,
        data: { id: newTrialId },
        message: 'Trial customer created successfully',
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error during trial creation:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to create trial - database error' },
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

      // Only show customers with Trial status
      conditions.push(eq(customerDB.subscriptionStatus, 'Trial'));

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

      // Get trial customers (simplified select to avoid null issues)
      const trialCustomers = await db
        .select()
        .from(customerDB)
        .where(whereClause)
        .orderBy(desc(customerDB.createdAt))
        .limit(limit)
        .offset(offset);

      total = trialCustomers.length; // Approximate total from current page

      // Convert customer data to trial list format
      trials = trialCustomers.map((customer) => {
        // Determine acquisition from customer notes
        const acquisition: 'HOMA' | 'Altrix' = 
          customer.customerNotes?.toLowerCase().includes('altrix') ? 'Altrix' : 'HOMA';
        
        // Use residential type from database, fallback to inference if not set
        let residentialType: 'House' | 'Office Space' | 'Apartment' = customer.residentialType as any || 'House';
        if (!customer.residentialType) {
          // Fallback inference for older records
          if (customer.subscriptionPackage?.toLowerCase().includes('office')) {
            residentialType = 'Office Space';
          } else if (customer.address?.toLowerCase().includes('apartment')) {
            residentialType = 'Apartment';
          }
        }

        // Format trial start date from subscription start
        let nextTrialStartDate: string | undefined;
        if (customer.subscriptionStart) {
          const date = new Date(customer.subscriptionStart);
          nextTrialStartDate = `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
        }

        // Format trial end date from subscription end
        let nextTrialEndDate: string | undefined;
        if (customer.subscriptionEnd) {
          const date = new Date(customer.subscriptionEnd);
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

        // Extract assigned cleaner from notes
        const cleanerMatch = customer.customerNotes?.match(/Assigned cleaner:\s*([^-\n]+)/i);
        const assignedCleaner = cleanerMatch ? cleanerMatch[1].trim() : '';

        return {
          id: customer.id,
          customerName: customer.customerName,
          acquisition,
          district: customer.district || '',
          city: customer.city,
          village: customer.village,
          residentialType,
          nextTrialStartDate,
          nextTrialEndDate,
          assignedCleaners: assignedCleaner ? [assignedCleaner] : [],
          overallStatus: 'Not Converted' as const, // Default trial status
          ltv,
          createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
          isDeleted: customer.isDeleted || false,
        };
      });

    } catch (dbError) {
      console.error('Database error during trials fetch:', dbError);
      
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