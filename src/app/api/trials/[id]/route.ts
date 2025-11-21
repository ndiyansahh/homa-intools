import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, regionDB, mitraDB, subscriptionPackageDB } from '@/lib/schema';
import { sql, and, or, eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { TrialDetail, TrialData } from '@/types/trial';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
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

    const trialId = (await params).id;
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
          contact: customerDB.contact,
          address: customerDB.address,
          city: customerDB.city,
          district: customerDB.district,
          village: customerDB.village,
          postalCode: customerDB.postalCode,
          subscriptionPackage: customerDB.subscriptionPackage,
          subscriptionStart: customerDB.subscriptionStart,
          subscriptionEnd: customerDB.subscriptionEnd,
          subscriptionStatus: customerDB.subscriptionStatus,
          monthlyFee: customerDB.monthlyFee,
          customerNotes: customerDB.customerNotes,
          assignedMitraId: customerDB.assignedMitraId,
          // totalSessions: customerDB.totalSessions, // Comment out until DB migration
          // chosenDays: customerDB.chosenDays, // Comment out until DB migration
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

      // Parse chosen days from JSON string (fallback to empty array if field doesn't exist)
      let chosenDays: string[] = [];
      try {
        // chosenDays = customer.chosenDays ? JSON.parse(customer.chosenDays) : []; // Comment out until DB migration
        chosenDays = []; // Default empty for now
      } catch (e) {
        console.warn('Failed to parse chosenDays JSON:', e);
        chosenDays = [];
      }

      // Use customer data
      const trialData: TrialData = {
        id: customer.id,
        customerName: customer.customerName,
        contact: customer.contact || '',
        acquisition,
        address: customer.address,
        district: customer.district || '',
        city: customer.city,
        village: customer.village || undefined,
        postalCode: customer.postalCode || '',
        residentialType,
        assignedCleaner: assignedCleaner || null,
        assignedMitraId: customer.assignedMitraId || null, // Include mitra ID for editing
        assignments,
        notes: customer.customerNotes || '',
        subscriptionPackage: customer.subscriptionPackage || '',
        subscriptionStartDate: trialStartFormatted || undefined, // dd/mm/yyyy format
        subscriptionEndDate: trialEndFormatted || undefined, // dd/mm/yyyy format
        monthlyFee: customer.monthlyFee ? parseFloat(customer.monthlyFee.toString()) : 0,
        totalSessions: 0, // customer.totalSessions || 0, // Default to 0 until DB migration
        chosenDays: chosenDays,
        overallStatus: assignments[0]?.status || 'Not Converted', // Extract status from assignments
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

    const trialId = (await params).id;
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
        await logAuditEvent({
          action: 'TRIAL_CUSTOMER_SOFT_DELETED',
          userId: session.userId,
          email: session.email,
          details: {
            customerId: trialId,
            customerName: existingCustomer[0].customerName,
          }
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

// PUT: Update trial data (including notes)
export async function PUT(request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can update
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const trialId = (await params).id;
    if (!trialId) {
      return NextResponse.json(
        { success: false, message: 'Trial ID is required' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      start_date,
      end_date,
      assigned_mitra_id,
      status,
      notes,
      subscription_package,
      total_sessions,
      chosen_days
    } = body;

    try {
      // Check if trial exists
      const existingTrial = await db
        .select()
        .from(customerDB)
        .where(eq(customerDB.id, trialId))
        .limit(1);

      if (existingTrial.length === 0) {
        return NextResponse.json(
          { success: false, message: 'Trial not found' },
          { status: 404 }
        );
      }

      // Prepare update data
      const updateData: any = {};
      
      if (start_date !== undefined) updateData.trialStartDate = start_date;
      if (end_date !== undefined) updateData.trialEndDate = end_date;
      if (assigned_mitra_id !== undefined) updateData.assignedMitraId = assigned_mitra_id;
      if (status !== undefined) updateData.overallStatus = status;
      if (notes !== undefined) updateData.notes = notes;
      if (subscription_package !== undefined) updateData.subscriptionPackage = subscription_package;
      if (total_sessions !== undefined) updateData.totalSessions = total_sessions;
      if (chosen_days !== undefined) updateData.chosenDays = chosen_days;

      console.log('Update data:', updateData);
      console.log('Request body:', body);

      // Check if there's anything to update
      if (Object.keys(updateData).length === 0) {
        return NextResponse.json(
          { success: false, message: 'No data to update' },
          { status: 400 }
        );
      }

      // Calculate LTV based on subscription dates
      const calculateLTV = (startDate: string | undefined, endDate: string | undefined): number => {
        if (!startDate || startDate === '') return 0;
        
        const start = new Date(startDate);
        const end = endDate && endDate !== '' ? new Date(endDate) : new Date();
        
        // Add 1 day to end date for inclusive calculation (like Excel DATEDIF)
        if (endDate && endDate !== '') {
          end.setDate(end.getDate() + 1);
        }
        
        // Calculate months difference
        const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        return Math.max(0, months);
      };

      const ltv = calculateLTV(updateData.trialStartDate, updateData.trialEndDate);

      // Dynamic multi-table transaction for trial to customer conversion
      await db.transaction(async (tx) => {
        // 1. Update customerDB with conversion data including LTV
        await tx
          .update(customerDB)
          .set({
            ...(updateData.notes !== undefined && { customerNotes: updateData.notes }),
            ...(updateData.trialStartDate !== undefined && updateData.trialStartDate !== '' && { subscriptionStart: updateData.trialStartDate }),
            ...(updateData.trialEndDate !== undefined && updateData.trialEndDate !== '' && { subscriptionEnd: updateData.trialEndDate }),
            ...(updateData.assignedMitraId !== undefined && { assignedMitraId: updateData.assignedMitraId }),
            ...(updateData.overallStatus !== undefined && { subscriptionStatus: updateData.overallStatus }),
            ...(updateData.subscriptionPackage !== undefined && { subscriptionPackage: updateData.subscriptionPackage }),
            ...(updateData.totalSessions !== undefined && { totalSessions: updateData.totalSessions }),
            ...(updateData.chosenDays !== undefined && { chosenDays: JSON.stringify(updateData.chosenDays) }),
            // Update LTV when dates are provided
            ...(ltv !== 0 && { ltv: ltv }),
            updatedAt: new Date()
          })
          .where(eq(customerDB.id, trialId));

        // 2. If converting to Active status (trial to customer conversion)
        if (updateData.overallStatus === 'Active') {
          // Update mitra total customers/visits count if mitra assigned
          if (updateData.assignedMitraId) {
            await tx.execute(sql`
              UPDATE mitra_db 
              SET total_visits = COALESCE(total_visits, 0) + ${updateData.totalSessions || 0},
                  updated_at = CURRENT_TIMESTAMP
              WHERE id = ${updateData.assignedMitraId}
            `);
          }

          // If subscription package is specified, link to package and ensure it's not Trial
          if (updateData.subscriptionPackage && updateData.subscriptionPackage !== 'Trial') {
            // Find the subscription package ID
            const packageResult = await tx
              .select({ id: subscriptionPackageDB.id, subscriptionPackage: subscriptionPackageDB.subscriptionPackage })
              .from(subscriptionPackageDB)
              .where(eq(subscriptionPackageDB.subscriptionPackage, updateData.subscriptionPackage))
              .limit(1);

            if (packageResult.length > 0) {
              // Update customer with package ID and ensure package name is set correctly
              await tx
                .update(customerDB)
                .set({ 
                  subscriptionPackageId: packageResult[0].id,
                  subscriptionPackage: packageResult[0].subscriptionPackage, // Ensure package name is updated
                  updatedAt: new Date()
                })
                .where(eq(customerDB.id, trialId));
            }
          } else if (!updateData.subscriptionPackage || updateData.subscriptionPackage === 'Trial') {
            // If no package specified or still Trial, default to a basic package for conversion
            console.log('Warning: Converting trial without specific package, defaulting to basic package');
          }

          // Update subscription end date if start date is provided
          if (updateData.trialStartDate && updateData.trialStartDate !== '') {
            const startDate = new Date(updateData.trialStartDate);
            const endDate = new Date(startDate);
            endDate.setMonth(endDate.getMonth() + 1); // Default 1 month subscription
            
            await tx
              .update(customerDB)
              .set({ 
                subscriptionEnd: endDate.toISOString().split('T')[0],
                updatedAt: new Date()
              })
              .where(eq(customerDB.id, trialId));
          }
        }
      });

      // Get updated data
      const result = await db
        .select()
        .from(customerDB)
        .where(eq(customerDB.id, trialId))
        .limit(1);

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'TRIAL_UPDATED',
          userId: session.userId,
          email: session.email,
          details: {
            trialId,
            updatedFields: Object.keys(updateData),
            notes: notes || 'Trial data updated'
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Trial updated successfully',
        data: result[0]
      });

    } catch (dbError) {
      console.error('Database error during trial update:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to update trial - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Update trial error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update trial' },
      { status: 500 }
    );
  }
}