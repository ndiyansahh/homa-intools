import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, attendanceScheduleDB, attendanceRecordDB, mitraDB, subscriptionPackageDB, visitDB } from '@/lib/schema';
import { eq, desc, like, and, or, gte } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';
import { createInvoice } from '@/lib/utils/invoiceUtils';

interface CreateTrialRequest {
  customer_name: string;
  contact: string;
  address: string;
  city_id: string;
  district_id: string;
  village_id: string;
  postal_code: string;
  residential_type?: 'House' | 'Apartment' | 'Office Space';
  // Trial Schedule fields
  trial_date?: string; // Changed: single date instead of start_date/end_date/selected_day
  selected_mitra?: string;
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
    if (!session) {
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

      // Validate trial schedule if provided
      if (body.trial_date && body.selected_mitra) {
        // Validate date format (YYYY-MM-DD)
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(body.trial_date)) {
          return NextResponse.json(
            { success: false, message: 'Invalid trial date format. Use YYYY-MM-DD' },
            { status: 400 }
          );
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
        // 1. Get Trial subscription package from database
        const trialPackageResult = await tx
          .select()
          .from(subscriptionPackageDB)
          .where(eq(subscriptionPackageDB.subscriptionPackage, 'Trial'))
          .limit(1);

        if (trialPackageResult.length === 0) {
          throw new Error('Trial subscription package not found in database');
        }

        const trialPackage = trialPackageResult[0];
        console.log('Using Trial package:', {
          id: trialPackage.id,
          name: trialPackage.subscriptionPackage,
          pricePerQty: trialPackage.pricePerQty,
          priceNumeric: trialPackage.priceNumeric
        });

        // 2. Get assigned mitra info from trial schedule
        let assignedMitraId = null;
        if (body.selected_mitra) {
          // Verify mitra exists and is active
          const mitraResult = await tx
            .select({
              id: mitraDB.id,
              mitraName: mitraDB.mitraName,
              status: mitraDB.status
            })
            .from(mitraDB)
            .where(eq(mitraDB.id, body.selected_mitra))
            .limit(1);

          if (mitraResult.length > 0 && mitraResult[0].status === 'Active') {
            assignedMitraId = body.selected_mitra;
          } else {
            throw new Error('Selected mitra is not active or does not exist');
          }
        }

        // 3. Get trial date from schedule
        let subscriptionStart = null;
        if (body.trial_date) {
          subscriptionStart = body.trial_date; // YYYY-MM-DD format from form
        }

        // 4. Create trial customer in customer_db with Trial package
        const customerData = {
          customerName: body.customer_name.trim(),
          contact: body.contact.trim(),
          address: body.address.trim(),
          city: cityName.trim(), // City name from form
          district: districtName.trim(), // District name from form
          village: villageName.trim(), // Village name from form
          postalCode: body.postal_code.trim(),
          assignedMitraId, // Assign the cleaner
          subscriptionPackageId: trialPackage.id, // Link to Trial package
          subscriptionPackage: trialPackage.subscriptionPackage, // 'Trial'
          subscriptionStart, // Add trial start date
          subscriptionStatus: 'Trial', // Trial status
          monthlyFee: '0', // Trial is free
          totalPaid: '0',
          outstandingBalance: '0',
          customerNotes: `Trial customer created via API - Trial ID: ${trialId}${body.residential_type ? ` - Residential Type: ${body.residential_type}` : ''}`,
          chosenDays: null, // No chosen days for single trial visit
          dayPattern: null, // No day pattern for single trial visit
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
            subscriptionStart: customerData.subscriptionStart, // Include trial date
            subscriptionStatus: customerData.subscriptionStatus,
            subscriptionPackage: customerData.subscriptionPackage,
            monthlyFee: customerData.monthlyFee,
            totalPaid: customerData.totalPaid,
            outstandingBalance: customerData.outstandingBalance,
            customerNotes: customerData.customerNotes,
            chosenDays: customerData.chosenDays, // No chosen days for single trial
            dayPattern: customerData.dayPattern, // No day pattern for single trial
            isActive: customerData.isActive,
            isDeleted: customerData.isDeleted,
            // createdAt and updatedAt are automatically set by database defaultNow()
          })
          .returning();

        const newCustomer = customerResult[0];

        // 5. Create single visit record if trial date is provided
        let visitsCreated = 0;
        if (body.trial_date && assignedMitraId) {
          // Create one visit record for the selected trial date
          const trialDate = new Date(body.trial_date);
          const dayName = trialDate.toLocaleDateString('en-US', { weekday: 'long' });

          const visitRecord = {
            customerId: newCustomer.id,
            mitraId: assignedMitraId, // Kept for backward compatibility
            originalMitraId: assignedMitraId, // Track original assignment
            actualMitraId: assignedMitraId, // Initially same as original, can be changed later
            visitNumber: 1,
            scheduledDate: body.trial_date, // Use the trial date directly
            scheduledDay: dayName,
            status: 'Done', // Feedback 4: Auto-attended so admin doesn't need to mark
            completedAt: trialDate, // For payout calculation
            durationHours: 3, // Default 3 hours for trial
          };

          await tx.insert(visitDB).values([visitRecord]);
          visitsCreated = 1;

          console.log(`✅ Created 1 visit record for trial ${newCustomer.id} on ${body.trial_date}`);
        }

        return {
          customer: newCustomer,
          visitsCreated,
        };
      });

      const newCustomer = result.customer;

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'TRIAL_CUSTOMER_CREATED',
          userId: session.userId,
          email: session.email,
          details: {
            customerId: newCustomer.id,
            trialId: trialId,
            customerName: body.customer_name,
            visitsCreated: result.visitsCreated || 0,
            method: 'trial_api',
          }
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
            visitsCreated: result.visitsCreated || 0,
            created_at: newCustomer.createdAt,
            updated_at: newCustomer.updatedAt,
          },
          message: `Trial customer created successfully${result.visitsCreated > 0 ? ` with ${result.visitsCreated} visit(s) scheduled` : ''}`,
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
  subscription_status?: 'Trial' | 'Trial Scheduled' | 'Active' | 'Churn' | 'Suspended' | 'Expired' | 'Cancelled' | 'Not Converted';
  notes?: string; // Customer notes
  subscription_package?: string; // Subscription package name
  total_sessions?: number; // Total sessions
  chosen_days?: string[]; // Array of chosen days
  qty_package?: number; // Quantity for package (1 qty = 1 month)
  convert_to_customer?: boolean; // Flag for full customer conversion
  promo_code?: string;
  promo_discount?: number;
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
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
      console.log('PUT /api/trial - Request body:', JSON.stringify(body, null, 2));
    } catch (parseError) {
      console.error('PUT /api/trial - JSON parse error:', parseError);
      return NextResponse.json(
        { success: false, message: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }

    // Validate required ID
    if (!body.id) {
      console.error('PUT /api/trial - Missing customer ID');
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
            console.warn(`⚠️ Assigned mitra ${body.assigned_mitra} not found, keeping existing assignment`);
          } else if (mitraResult[0].status !== 'Active') {
            console.warn(`⚠️ Assigned mitra ${body.assigned_mitra} is not active (status: ${mitraResult[0].status}), keeping existing assignment`);
          } else {
            assignedMitraId = body.assigned_mitra;
          }
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

        // Handle customer conversion logic
        if (body.convert_to_customer && body.subscription_package) {
          console.log('Converting trial to customer with package:', body.subscription_package);

          // Fetch subscription package data for accurate pricing
          const packageResult = await tx
            .select()
            .from(subscriptionPackageDB)
            .where(eq(subscriptionPackageDB.subscriptionPackage, body.subscription_package))
            .limit(1);

          let monthlyFee = 0;
          let subscriptionPackageId = null;

          if (packageResult.length > 0) {
            const packageData = packageResult[0];
            const quantity = body.qty_package || 1; // Default to 1 if not specified
            monthlyFee = parseFloat(packageData.priceNumeric.toString()) * quantity;
            subscriptionPackageId = packageData.id;
            console.log('Found package in database:', {
              id: packageData.id,
              name: packageData.subscriptionPackage,
              pricePerQty: packageData.pricePerQty,
              priceNumeric: packageData.priceNumeric,
              quantity: quantity,
              totalPrice: monthlyFee
            });
          } else {
            console.log('Package not found in database:', body.subscription_package);
            throw new Error(`Subscription package '${body.subscription_package}' not found in database`);
          }

          // Update customer data with subscription package information
          updateData.monthlyFee = monthlyFee.toString();
          updateData.subscriptionPackageId = subscriptionPackageId;
          updateData.subscriptionStatus = 'Active';
          updateData.qtyPackage = body.qty_package || 1;

          // Set subscription dates and calculate LTV
          if (body.start_date) {
            updateData.subscriptionStart = body.start_date;

            // Calculate subscription end date: EDATE(start, qty) - 1
            const quantity = body.qty_package || 1;
            const [sy, sm, sd] = body.start_date.split('-').map(Number);
            const daysInTargetMonth = new Date(sy, sm - 1 + quantity + 1, 0).getDate();
            const clampedDay = Math.min(sd, daysInTargetMonth);
            const endDate = new Date(sy, sm - 1 + quantity, clampedDay - 1);
            const ey = endDate.getFullYear();
            const em = String(endDate.getMonth() + 1).padStart(2, '0');
            const ed = String(endDate.getDate()).padStart(2, '0');
            updateData.subscriptionEnd = `${ey}-${em}-${ed}`;

            // Set LTV based on quantity (1 qty = 1 month)
            updateData.ltv = quantity;
            console.log('Calculated LTV for trial conversion (quantity-based):', updateData.ltv, 'months');
          }

          // Store total sessions and chosen days if provided
          if (body.total_sessions !== undefined) {
            updateData.totalSessions = body.total_sessions;
          }

          if (body.chosen_days !== undefined && Array.isArray(body.chosen_days)) {
            updateData.chosenDays = JSON.stringify(body.chosen_days); // Store as JSON string
          }

          console.log('Customer conversion data:', {
            monthlyFee,
            subscriptionPackageId,
            subscriptionStart: updateData.subscriptionStart,
            subscriptionEnd: updateData.subscriptionEnd,
            package: body.subscription_package,
            totalSessions: body.total_sessions,
            chosenDays: body.chosen_days
          });
        }

        // 4. Update customer if there are changes
        if (Object.keys(updateData).length > 0) {
          updateData.updatedAt = new Date();

          console.log('About to update customer with data:', JSON.stringify(updateData, null, 2));

          const updatedCustomer = await tx
            .update(customerDB)
            .set(updateData)
            .where(eq(customerDB.id, body.id))
            .returning();

          // 5. Cancel all Scheduled visits when trial is cancelled
          if (body.subscription_status === 'Cancelled') {
            await tx
              .update(visitDB)
              .set({ status: 'Cancelled', updatedAt: new Date() })
              .where(
                and(
                  eq(visitDB.customerId, body.id),
                  eq(visitDB.status, 'Scheduled')
                )
              );
            console.log('✅ Cancelled all Scheduled visits for cancelled trial');
          }

          // 6. Generate new visit schedule when converting trial to customer
          if (body.convert_to_customer && body.start_date && body.chosen_days && assignedMitraId) {
            console.log('🔄 Converting trial to customer - generating new visit schedule');

            // Step 1: Delete all visits on or after subscription start date (includes Done visits from /api/subscriptions step)
            // Keep only trial Done visits BEFORE the subscription start date as history
            await tx
              .delete(visitDB)
              .where(
                and(
                  eq(visitDB.customerId, body.id),
                  gte(visitDB.scheduledDate, body.start_date)
                )
              );
            console.log('✅ Deleted all visits from subscription start date onwards (keeping pre-subscription trial history)');

            // Step 2: New subscription visits always start from 1
            // Trial Done visits are kept as history but filtered in customer view by subscriptionStart date
            const maxVisitNumber = 0;
            console.log('📊 New subscription visits will start from visitNumber 1');

            // Step 3: Generate visit dates based on chosen days and subscription dates
            const startDate = new Date(body.start_date);
            const endDate = new Date(updateData.subscriptionEnd || body.start_date);
            const visitDates: { date: Date; day: string }[] = [];

            // Parse chosen days (array of day names)
            const chosenDayNames = body.chosen_days;
            console.log('📅 Chosen days:', chosenDayNames);

            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
              const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
              if (chosenDayNames.includes(dayName)) {
                visitDates.push({
                  date: new Date(currentDate),
                  day: dayName
                });
              }
              currentDate.setDate(currentDate.getDate() + 1);
            }

            console.log(`📆 Generated ${visitDates.length} visit dates for customer schedule`);

            // Step 4: Create visit records
            if (visitDates.length > 0) {
              const visitRecords = visitDates.map((visit, index) => ({
                customerId: body.id,
                mitraId: assignedMitraId,
                originalMitraId: assignedMitraId,
                actualMitraId: assignedMitraId,
                visitNumber: maxVisitNumber + index + 1,
                scheduledDate: visit.date.toISOString().split('T')[0],
                scheduledDay: visit.day,
                status: 'Done', // Feedback 4: Auto-attended so admin doesn't need to mark
                completedAt: visit.date, // For payout calculation
                durationHours: 3, // Default 3 hours
              }));

              await tx.insert(visitDB).values(visitRecords);
              console.log(`✅ Created ${visitRecords.length} new visit records for converted customer`);
            }
          }

          return updatedCustomer[0];
        }

        return customer;
      });

      // Create invoice for converted customer (outside transaction, uses global db)
      if (body.convert_to_customer) {
        try {
          const invoice = await createInvoice({
            customerId: body.id,
            invoicePromoCode: body.promo_code || undefined,
            invoicePromoDiscount: body.promo_discount ? Number(body.promo_discount) : undefined,
          });
          // Save invoiceId back to customerDB
          await db
            .update(customerDB)
            .set({ invoiceId: invoice.id })
            .where(eq(customerDB.id, body.id));
          console.log(`✅ Invoice created for converted customer: ${invoice.invoiceNumber}`);
        } catch (invoiceError: any) {
          console.error('⚠️ Failed to create invoice during trial conversion:', invoiceError);
          console.error('Invoice error details:', {
            message: invoiceError?.message,
            code: invoiceError?.code,
            detail: invoiceError?.detail,
            constraint: invoiceError?.constraint,
            column: invoiceError?.column,
          });
          // Don't fail the conversion if invoice creation fails
        }
      }

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'TRIAL_CUSTOMER_UPDATED',
          userId: session.userId,
          email: session.email,
          details: {
            customerId: body.id,
            updatedFields: Object.keys(body).filter(key => key !== 'id'),
            method: 'trial_update_api',
          }
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
            updated_at: new Date().toISOString(),
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