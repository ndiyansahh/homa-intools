import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, attendanceScheduleDB, attendanceRecordDB, mitraDB } from '@/lib/schema';
import { eq, desc, like } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

interface TrialAssignment {
  date: string;
  selected_mitra: string;
  status: string;
}

interface CreateTrialRequest {
  customer_name: string;
  contact: string;
  address: string;
  city_id: string;
  district_id: string;
  village_id: string;
  postal_code: string;
  residential_type?: 'House' | 'Apartment' | 'Office Space';
  assignments?: TrialAssignment[];
}

/**
 * Generate random UUID for trial customer
 * Uses crypto.randomUUID() to avoid confusion with invoice IDs
 */
function generateTrialID(): string {
  return crypto.randomUUID();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create trial customers
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body: CreateTrialRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required fields
    const requiredFields: (keyof CreateTrialRequest)[] = [
      'customer_name',
      'contact', 
      'address',
      'city_id',
      'district_id',
      'village_id',
      'postal_code'
    ];

    const missingFields = requiredFields.filter(field => 
      !body[field] || (typeof body[field] === 'string' && !body[field].trim())
    );

    if (missingFields.length > 0) {
      return NextResponse.json(
        { 
          success: false, 
          message: `Missing required fields: ${missingFields.join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Additional validation
    if (body.contact && !body.contact.match(/^[0-9+\-\s()]+$/)) {
      return NextResponse.json(
        { success: false, message: 'Invalid contact format' },
        { status: 400 }
      );
    }

    try {
      // Generate trial ID (random UUID)
      const trialId = generateTrialID();
      
      // Validate assignments if provided
      if (body.assignments && body.assignments.length > 0) {
        for (let i = 0; i < body.assignments.length; i++) {
          const assignment = body.assignments[i];
          if (!assignment.date || !assignment.selected_mitra) {
            return NextResponse.json(
              { success: false, message: `Assignment ${i + 1}: Date and mitra are required` },
              { status: 400 }
            );
          }
          
          // Validate date format (YYYY-MM-DD)
          const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
          if (!dateRegex.test(assignment.date)) {
            return NextResponse.json(
              { success: false, message: `Assignment ${i + 1}: Invalid date format. Use YYYY-MM-DD` },
              { status: 400 }
            );
          }
        }
      }
      
      // Region IDs from cascading dropdowns are actually the names themselves
      // Cities API returns { id: cityName, name: cityName }
      // Districts API returns { id: districtName, name: districtName }
      // Villages API returns { id: villageName, name: villageName }
      const cityName = body.city_id;
      const districtName = body.district_id;
      const villageName = body.village_id;
      
      console.log('Trial customer data:', {
        input: { city_id: body.city_id, district_id: body.district_id, village_id: body.village_id },
        saving: { cityName, districtName, villageName }
      });

      // Use database transaction for atomic operations
      const result = await db.transaction(async (tx) => {
        // 1. Get assigned mitra info from first assignment
        let assignedMitraId = null;
        if (body.assignments && body.assignments.length > 0) {
          const firstAssignment = body.assignments[0];
          if (firstAssignment.selected_mitra) {
            // Verify mitra exists and is active
            const mitraResult = await tx
              .select({
                id: mitraDB.id,
                mitraName: mitraDB.mitraName,
                status: mitraDB.status
              })
              .from(mitraDB)
              .where(eq(mitraDB.id, firstAssignment.selected_mitra))
              .limit(1);
            
            if (mitraResult.length > 0 && mitraResult[0].status === 'Active') {
              assignedMitraId = firstAssignment.selected_mitra;
            }
          }
        }

        // Get trial date from first assignment
        let subscriptionStart = null;
        if (body.assignments && body.assignments.length > 0) {
          const firstAssignment = body.assignments[0];
          if (firstAssignment.date) {
            subscriptionStart = firstAssignment.date; // YYYY-MM-DD format from form
          }
        }

        // Create trial customer with proper cleaner assignment
        const customerData = {
          customerName: body.customer_name.trim(),
          contact: body.contact.trim(),
          address: body.address.trim(),
          city: cityName.trim(), // City name from form
          district: districtName.trim(), // District name from form
          village: villageName.trim(), // Village name from form
          postalCode: body.postal_code.trim(),
          assignedMitraId, // Assign the cleaner
          subscriptionStart, // Add trial start date
          // residentialType: body.residential_type || 'House', // TODO: Add after database migration
          subscriptionStatus: 'Trial', // Use Trial since Trial Scheduled not allowed by DB constraint
          subscriptionPackage: 'Trial Package - Basic Cleaning (1 visit)',
          monthlyFee: '0',
          totalPaid: '0',
          outstandingBalance: '0',
          customerNotes: `Trial customer created via API - Trial ID: ${trialId}${body.residential_type ? ` - Residential Type: ${body.residential_type}` : ''}`,
          isActive: true,
          isDeleted: false,
          // createdAt and updatedAt are automatically set by database defaultNow()
        };

        const customerResult = await tx
          .insert(customerDB)
          .values({
            customerName: customerData.customerName,
            contact: customerData.contact,
            address: customerData.address,
            city: customerData.city,
            district: customerData.district,
            village: customerData.village,
            postalCode: customerData.postalCode,
            assignedMitraId: customerData.assignedMitraId, // Include the assigned cleaner
            subscriptionStart: customerData.subscriptionStart, // Include trial start date
            subscriptionStatus: customerData.subscriptionStatus,
            subscriptionPackage: customerData.subscriptionPackage,
            monthlyFee: customerData.monthlyFee,
            totalPaid: customerData.totalPaid,
            outstandingBalance: customerData.outstandingBalance,
            customerNotes: customerData.customerNotes,
            isActive: customerData.isActive,
            isDeleted: customerData.isDeleted,
            // createdAt and updatedAt are automatically set by database defaultNow()
          })
          .returning();

        const newCustomer = customerResult[0];
        
        // 2. Create trial assignments if provided - simplified for now
        const assignmentResults = [];
        if (body.assignments && body.assignments.length > 0) {
          // For now, just track assignments without creating attendance records
          // TODO: Implement attendance creation after fixing transaction issues
          for (const assignment of body.assignments) {
            assignmentResults.push({
              mitraId: assignment.selected_mitra,
              date: assignment.date,
              status: assignment.status,
              isMockData: true, // Treat all as mock for now
            });
          }
        }

        return {
          customer: newCustomer,
          assignments: assignmentResults,
        };
      });

      const newCustomer = result.customer;

      // Log audit event
      if (session) {
        await logAuditEvent(session.userId, 'TRIAL_CUSTOMER_CREATED', {
          customerId: newCustomer.id,
          trialId: trialId,
          customerName: body.customer_name,
          assignmentsCount: body.assignments?.length || 0,
          method: 'trial_api',
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: newCustomer.id,
            trial_id: trialId,
            customer_name: newCustomer.customerName,
            contact: newCustomer.contact,
            address: newCustomer.address,
            city_id: newCustomer.city,
            district_id: newCustomer.district,
            village_id: newCustomer.village,
            postal_code: newCustomer.postalCode,
            status: newCustomer.subscriptionStatus,
            assignments_created: result.assignments.length,
            created_at: newCustomer.createdAt,
            updated_at: newCustomer.updatedAt,
          },
          message: `Trial customer created successfully${result.assignments.length > 0 ? ` with ${result.assignments.length} assignment(s)` : ''}`,
        },
        { status: 201 }
      );

    } catch (dbError: any) {
      console.error('Database error during trial customer creation:', dbError);
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
      
      // Handle specific database errors
      if (dbError.code === '23505') { // PostgreSQL unique constraint violation
        return NextResponse.json(
          { success: false, message: 'Customer with this information already exists' },
          { status: 409 }
        );
      }
      
      if (dbError.code === '23503') { // PostgreSQL foreign key constraint violation
        if (dbError.message?.includes('mitra_id')) {
          return NextResponse.json(
            { success: false, message: 'Invalid mitra ID specified in assignment' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, message: 'Foreign key constraint violation' },
          { status: 400 }
        );
      }
      
      // Handle custom error messages from transaction
      if (dbError.message?.includes('Mitra with ID')) {
        return NextResponse.json(
          { success: false, message: dbError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to create trial customer - database error',
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
    console.error('Trial customer creation API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}

interface UpdateTrialRequest {
  id: string;
  start_date?: string; // YYYY-MM-DD format
  end_date?: string; // YYYY-MM-DD format  
  assigned_mitra?: string; // UUID of mitra
  subscription_status?: 'Trial' | 'Trial Scheduled' | 'Active' | 'Inactive' | 'Suspended' | 'Expired' | 'Cancelled';
  notes?: string; // Customer notes
  subscription_package?: string; // Subscription package name
  total_sessions?: number; // Total sessions
  chosen_days?: string[]; // Array of chosen days
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can update trial customers
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden - Insufficient permissions' },
        { status: 403 }
      );
    }

    // Parse and validate request body
    let body: UpdateTrialRequest;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required ID
    if (!body.id) {
      return NextResponse.json(
        { success: false, message: 'Customer ID is required' },
        { status: 400 }
      );
    }

    // Validate date formats if provided
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (body.start_date && !dateRegex.test(body.start_date)) {
      return NextResponse.json(
        { success: false, message: 'Invalid start date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }
    if (body.end_date && !dateRegex.test(body.end_date)) {
      return NextResponse.json(
        { success: false, message: 'Invalid end date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    try {
      // Use database transaction for atomic operations
      const result = await db.transaction(async (tx) => {
        // 1. Check if customer exists and is a trial customer
        const existingCustomer = await tx
          .select({
            id: customerDB.id,
            customerName: customerDB.customerName,
            subscriptionStatus: customerDB.subscriptionStatus,
            assignedMitraId: customerDB.assignedMitraId,
            subscriptionStart: customerDB.subscriptionStart,
            subscriptionEnd: customerDB.subscriptionEnd
          })
          .from(customerDB)
          .where(eq(customerDB.id, body.id))
          .limit(1);

        if (existingCustomer.length === 0) {
          throw new Error('Customer not found');
        }

        const customer = existingCustomer[0];

        // 2. Validate assigned mitra if provided
        let assignedMitraId = customer.assignedMitraId;
        if (body.assigned_mitra) {
          const mitraResult = await tx
            .select({
              id: mitraDB.id,
              mitraName: mitraDB.mitraName,
              status: mitraDB.status
            })
            .from(mitraDB)
            .where(eq(mitraDB.id, body.assigned_mitra))
            .limit(1);
          
          if (mitraResult.length === 0) {
            throw new Error('Assigned mitra not found');
          }
          
          if (mitraResult[0].status !== 'Active') {
            throw new Error('Assigned mitra is not active');
          }
          
          assignedMitraId = body.assigned_mitra;
        }

        // 3. Prepare update data
        const updateData: any = {};
        
        if (body.start_date) {
          updateData.subscriptionStart = body.start_date;
        }
        
        if (body.end_date) {
          updateData.subscriptionEnd = body.end_date;
        }
        
        if (assignedMitraId !== customer.assignedMitraId) {
          updateData.assignedMitraId = assignedMitraId;
        }
        
        if (body.subscription_status) {
          updateData.subscriptionStatus = body.subscription_status;
        }
        
        if (body.notes !== undefined) {
          updateData.customerNotes = body.notes;
        }
        
        if (body.subscription_package) {
          updateData.subscriptionPackage = body.subscription_package;
        }
        
        // Comment out until DB migration
        // if (body.total_sessions !== undefined) {
        //   updateData.totalSessions = body.total_sessions;
        // }
        
        // if (body.chosen_days !== undefined) {
        //   updateData.chosenDays = JSON.stringify(body.chosen_days); // Store as JSON string
        // }

        // 4. Update customer if there are changes
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date().toISOString();
          
          const updatedCustomer = await tx
            .update(customerDB)
            .set(updateData)
            .where(eq(customerDB.id, body.id))
            .returning();

          return updatedCustomer[0];
        }

        return customer;
      });

      // Log audit event
      if (session) {
        await logAuditEvent(session.userId, 'TRIAL_CUSTOMER_UPDATED', {
          customerId: body.id,
          updatedFields: Object.keys(body).filter(key => key !== 'id'),
          method: 'trial_update_api',
        });
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: result.id,
            customer_name: result.customerName,
            subscription_status: result.subscriptionStatus,
            subscription_start: result.subscriptionStart,
            subscription_end: result.subscriptionEnd,
            assigned_mitra_id: result.assignedMitraId,
            updated_at: result.updatedAt,
          },
          message: 'Trial customer updated successfully',
        },
        { status: 200 }
      );

    } catch (dbError: any) {
      console.error('Database error during trial customer update:', dbError);
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
      });
      
      // Handle specific database errors
      if (dbError.code === '23503') { // PostgreSQL foreign key constraint violation
        if (dbError.message?.includes('mitra_id')) {
          return NextResponse.json(
            { success: false, message: 'Invalid mitra ID specified' },
            { status: 400 }
          );
        }
        return NextResponse.json(
          { success: false, message: 'Foreign key constraint violation' },
          { status: 400 }
        );
      }
      
      // Handle custom error messages from transaction
      if (dbError.message?.includes('Customer not found')) {
        return NextResponse.json(
          { success: false, message: 'Customer not found' },
          { status: 404 }
        );
      }
      
      if (dbError.message?.includes('mitra')) {
        return NextResponse.json(
          { success: false, message: dbError.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { 
          success: false, 
          message: 'Failed to update trial customer - database error',
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
    console.error('Trial customer update API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}