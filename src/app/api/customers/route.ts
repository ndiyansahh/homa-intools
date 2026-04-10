import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, mitraDB, visitDB, invoiceDB } from '@/lib/schema';
import { sql, and, or, ilike, eq, desc, count, isNull, max } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';
import { sanitizeSQLLike, sanitizeText } from '@/lib/input-sanitizer';
import { createInvoice } from '@/lib/utils/invoiceUtils';
import type { CustomerListItem, CustomersResponse, CustomerApiError, CreateCustomerRequest } from '@/types/customer';

export async function GET(request: NextRequest): Promise<NextResponse<CustomersResponse | CustomerApiError>> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view customers
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    // Filter parameters
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const city = searchParams.get('city') || '';
    const subscriptionPackage = searchParams.get('subscriptionPackage') || '';
    const assignedMitra = searchParams.get('assignedMitra') || searchParams.get('assigned_mitra') || '';

    // Build where conditions for database query
    const conditions = [];

    // Search in customer name, address, or contact
    // SECURITY FIX: Sanitize search input to prevent SQL injection
    if (search) {
      const sanitizedSearch = sanitizeSQLLike(search);
      if (sanitizedSearch) {
        conditions.push(
          or(
            ilike(customerDB.customerName, `%${sanitizedSearch}%`),
            ilike(customerDB.address, `%${sanitizedSearch}%`),
            ilike(customerDB.contact, `%${sanitizedSearch}%`)
          )
        );
      }
    }

    // Status filter - map to subscriptionStatus
    // SECURITY FIX: Sanitize all filter inputs
    if (status) {
      const sanitizedStatus = sanitizeSQLLike(status);
      if (sanitizedStatus) {
        conditions.push(ilike(customerDB.subscriptionStatus, `%${sanitizedStatus}%`));
      }
    }

    // City filter
    if (city) {
      const sanitizedCity = sanitizeSQLLike(city);
      if (sanitizedCity) {
        conditions.push(ilike(customerDB.city, `%${sanitizedCity}%`));
      }
    }

    // Subscription package filter
    if (subscriptionPackage) {
      const sanitizedPackage = sanitizeSQLLike(subscriptionPackage);
      if (sanitizedPackage) {
        conditions.push(ilike(customerDB.subscriptionPackage, `%${sanitizedPackage}%`));
      }
    }

    // Assigned mitra filter - filter by primary or backup mitra
    if (assignedMitra) {
      conditions.push(
        or(
          eq(customerDB.assignedMitraId, assignedMitra),
          eq(customerDB.backupMitraId, assignedMitra)
        )
      );
    }

    // Add soft delete condition (only show non-deleted customers)
    conditions.push(or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`));

    // Exclude all trial customers regardless of status — only show real customers (Active, Converted, Inactive, etc.)
    // Trial customers (including Cancelled trials) belong in the Trial management page, not here
    conditions.push(sql`(${customerDB.subscriptionStatus} NOT IN ('Trial', 'Trial Scheduled') OR ${customerDB.subscriptionStatus} IS NULL)`);
    conditions.push(sql`(${customerDB.subscriptionPackage} != 'Trial' OR ${customerDB.subscriptionPackage} IS NULL)`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count from database
    const countResult = await db
      .select({ count: count() })
      .from(customerDB)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Get paginated customers from database with latest invoice
    const result = await db
      .select({
        id: customerDB.id,
        customerName: customerDB.customerName,
        subscriptionPackage: customerDB.subscriptionPackage,
        subscriptionStatus: customerDB.subscriptionStatus,
        monthlyFee: customerDB.monthlyFee,
        city: customerDB.city,
        ltv: customerDB.ltv,
        createdAt: customerDB.createdAt,
        updatedAt: customerDB.updatedAt,
        invoiceNumber: invoiceDB.invoiceNumber, // 7a: Invoice ID Display
        invoiceDbId: invoiceDB.id, // UUID for PDF download
      })
      .from(customerDB)
      .leftJoin(
        invoiceDB,
        and(
          eq(invoiceDB.customerId, customerDB.id),
          or(eq(invoiceDB.isDeleted, false), isNull(invoiceDB.isDeleted))
        )
      )
      .where(whereClause)
      .orderBy(desc(customerDB.createdAt), desc(invoiceDB.createdAt)) // Prioritize most recent invoice
      .limit(limit)
      .offset(offset);

    // De-duplicate customers (LEFT JOIN may return multiple rows if customer has multiple invoices)
    // Keep the first row per customer which has the most recent invoice due to ORDER BY
    const seenCustomers = new Set<string>();
    const uniqueResults = result.filter(customer => {
      if (seenCustomers.has(customer.id)) {
        return false;
      }
      seenCustomers.add(customer.id);
      return true;
    });

    const customers: CustomerListItem[] = uniqueResults.map(customer => ({
      id: customer.id,
      customerName: customer.customerName,
      subscriptionPackage: customer.subscriptionPackage || '',
      subscriptionStatus: customer.subscriptionStatus as any || 'Active',
      monthlyFee: Number(customer.monthlyFee) || 0,
      city: customer.city,
      invoiceId: customer.invoiceNumber || undefined, // 7a: Invoice ID Display
      invoiceDbId: customer.invoiceDbId || undefined, // UUID for PDF download
      ltv: customer.ltv || 0,
      createdAt: customer.createdAt?.toISOString() || new Date().toISOString(),
      updatedAt: customer.updatedAt?.toISOString() || new Date().toISOString(),
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: customers,
      items: customers,
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
      message: customers.length === 0 && total === 0 ? 'No customers found' : undefined,
    });

  } catch (error) {
    console.error('Customers API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to fetch customers',
        error: process.env.NODE_ENV === 'development' ? String(error) : 'Internal server error',
      } as any,
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
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

    const body = await request.json() as CreateCustomerRequest;

    // Validate required fields
    if (!body.customerName || !body.contact || !body.address || !body.city) {
      return NextResponse.json(
        { success: false, message: 'Missing required fields: customerName, contact, address, city' },
        { status: 400 }
      );
    }

    try {
      // Find mitra IDs for the selected cleaners
      let assignedMitraId = null;
      let backupMitraId = null;

      if ((body as any).cleaner1) {
        const primaryMitra = await db
          .select({ id: mitraDB.id })
          .from(mitraDB)
          .where(eq(mitraDB.mitraName, (body as any).cleaner1))
          .limit(1);

        if (primaryMitra.length > 0) {
          assignedMitraId = primaryMitra[0].id;
        }
      }

      if ((body as any).cleaner2) {
        const backupMitra = await db
          .select({ id: mitraDB.id })
          .from(mitraDB)
          .where(eq(mitraDB.mitraName, (body as any).cleaner2))
          .limit(1);

        if (backupMitra.length > 0) {
          backupMitraId = backupMitra[0].id;
        }
      }

      // Create customer in database
      const customerData = {
        customerName: body.customerName,
        contact: body.contact,
        address: body.address,
        city: body.city,
        district: body.district || null,
        village: body.village || null,
        postalCode: body.postalCode || null,
        subscriptionPackage: body.subscriptionPackage || null,
        subscriptionPackageId: (body as any).subscriptionPackageId || null,
        assignedMitraId: assignedMitraId,
        backupMitraId: backupMitraId,
        subscriptionStart: (body as any).subscriptionStart || null,
        subscriptionEnd: (body as any).subscriptionEnd || null,
        subscriptionStatus: (body as any).subscriptionStatus || 'Active',
        // subscriptionQTY: (body as any).subscriptionQTY || 1, // Column doesn't exist in actual database
        // subscriptionPerQTY: (body as any).subscriptionPerQTY ? (body as any).subscriptionPerQTY.toString() : '0', // Column doesn't exist in actual database
        monthlyFee: (body as any).monthlyFee ? (body as any).monthlyFee.toString() : '0',
        totalPaid: '0',
        outstandingBalance: (body as any).monthlyFee ? (body as any).monthlyFee.toString() : '0',
        customerNotes: (body as any).customerNotes || null,
        chosenDays: (body as any).selectedDays ? JSON.stringify((body as any).selectedDays) : null,
        dayPattern: (body as any).selectedDays ? JSON.stringify((body as any).selectedDays) : null,
        ltv: (body as any).ltv || 0,
        isActive: true,
        isDeleted: false,
      };

      console.log('Creating customer with mitra assignments:', {
        cleaner1: (body as any).cleaner1,
        cleaner2: (body as any).cleaner2,
        assignedMitraId,
        backupMitraId
      });

      const result = await db
        .insert(customerDB)
        .values(customerData)
        .returning({ id: customerDB.id });

      const newCustomerId = result[0]?.id;

      // URGENT: Generate invoice for customer (Chris requirement)
      let invoiceId: string | null = null;
      if (newCustomerId && (body as any).subscriptionStart) {
        try {
          const invoice = await createInvoice({
            customerId: newCustomerId,
            invoicePromoCode: (body as any).promoCode || undefined,
            invoicePromoDiscount: (body as any).promoDiscount ? Number((body as any).promoDiscount) : undefined,
          });
          invoiceId = invoice.id;

          // Update customer with invoice_id
          await db
            .update(customerDB)
            .set({ invoiceId: invoiceId })
            .where(eq(customerDB.id, newCustomerId));

          console.log(`✅ Invoice created and linked: ${invoice.invoiceNumber} → Customer ${newCustomerId}`);
        } catch (invoiceError) {
          console.error('⚠️  Failed to create invoice for customer:', invoiceError);
          // Don't fail customer creation if invoice fails
        }
      }

      // Generate visit schedule if all required data is provided
      if (newCustomerId && assignedMitraId && (body as any).subscriptionStart && (body as any).selectedDays) {
        console.log('🔄 Generating visit schedule for new customer');

        const startDate = new Date((body as any).subscriptionStart);
        const endDate = (body as any).subscriptionEnd
          ? new Date((body as any).subscriptionEnd)
          : new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

        const visitDates: { date: Date; day: string }[] = [];
        const selectedDaysObj = (body as any).selectedDays;

        // Convert selectedDays object to array (e.g., {day1: 'Monday', day2: 'Tuesday'} => ['Monday', 'Tuesday'])
        const chosenDays = Object.values(selectedDaysObj).filter((day): day is string => Boolean(day));

        const currentDate = new Date(startDate);
        while (currentDate <= endDate) {
          const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
          if (chosenDays.includes(dayName)) {
            visitDates.push({
              date: new Date(currentDate),
              day: dayName
            });
          }
          currentDate.setDate(currentDate.getDate() + 1);
        }

        if (visitDates.length > 0) {
          const visitRecords = visitDates.map((visit, index) => ({
            customerId: newCustomerId,
            invoiceId: invoiceId || undefined, // Link visits to invoice for tracking
            mitraId: assignedMitraId,
            originalMitraId: assignedMitraId,
            actualMitraId: assignedMitraId,
            visitNumber: index + 1,
            scheduledDate: visit.date.toISOString().split('T')[0],
            scheduledDay: visit.day,
            status: 'Done', // Feedback 4: Auto-attended so admin doesn't need to mark
            completedAt: visit.date, // For payout calculation
            durationHours: 3,
          }));

          await db.insert(visitDB).values(visitRecords);
          console.log(`✅ Created ${visitRecords.length} visit records for new customer (Invoice: ${invoiceId || 'N/A'})`);
        }
      }

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'CUSTOMER_CREATED',
          userId: session.userId,
          email: session.email,
          details: { customerId: newCustomerId }
        });
      }

      return NextResponse.json({
        success: true,
        data: { id: newCustomerId, ...customerData },
        message: 'Customer created successfully',
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error during customer creation:', dbError);
      return NextResponse.json(
        { success: false, message: 'Failed to create customer - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Customer creation API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to create customer' },
      { status: 500 }
    );
  }
}