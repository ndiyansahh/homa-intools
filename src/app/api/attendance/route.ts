import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CreateAttendanceRequest, AttendanceRecord, AttendanceResponse } from '@/types/customer';
import { logAuditEvent } from '@/lib/logger';
import { createAttendanceRecord, getAttendanceRecordsWithFullData, updateAttendanceRecordMitraInfo } from '@/lib/utils/attendanceUtils';
import { db } from '@/lib/db';
import { attendanceRecordDB, visitDB, customerDB, mitraDB } from '@/lib/schema';
import { eq, and, or, sql, count, like, gte, lte, desc } from 'drizzle-orm';

// Mock data storage (replace with real database)
let attendanceData: AttendanceRecord[] = [
  {
    id: '1',
    no: 1,
    clientName: 'Marta',
    address: 'Jl. Sudirman No. 123, Jakarta Pusat',
    package: 'Monthly Subscription of Regular Cleaning',
    startDate: '25/11/2022',
    endDate: '25/11/2022',
    newEndDate: '30/11/2022',
    cleaner1: 'Caca',
    cleaner2: 'Aca',
    createdAt: '2022-11-25T10:00:00Z',
    updatedAt: '2022-11-28T14:30:00Z',
    isDeleted: false,
  },
  {
    id: '2',
    no: 2,
    clientName: 'Handi Sulyansah',
    address: '1 Park Residences',
    package: 'Monthly Subscription of Regular Cleaning',
    startDate: '01/12/2022',
    endDate: '01/12/2022',
    cleaner1: 'Ardi',
    cleaner2: 'Inem',
    createdAt: '2022-12-01T09:00:00Z',
    updatedAt: '2022-12-01T09:00:00Z',
    isDeleted: false,
  },
  {
    id: '3',
    no: 3,
    clientName: 'Sarah Williams',
    address: 'Apartment 15B Green Tower',
    package: 'Monthly Subscription of Frequent Cleaning',
    startDate: '15/12/2022',
    endDate: '15/12/2022',
    newEndDate: '20/12/2022',
    cleaner1: 'Handi',
    cleaner2: 'Syeila',
    createdAt: '2022-12-15T11:00:00Z',
    updatedAt: '2022-12-18T15:00:00Z',
    isDeleted: false,
  },
  {
    id: '4',
    no: 4,
    clientName: 'Michael Chen',
    address: 'Office Suite 501, Plaza Indonesia',
    package: 'Monthly Subscription of Basic Cleaning',
    startDate: '20/12/2022',
    endDate: '20/12/2022',
    cleaner1: 'Syeila',
    cleaner2: 'Imam',
    createdAt: '2022-12-20T13:00:00Z',
    updatedAt: '2022-12-20T13:00:00Z',
    isDeleted: false,
  },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();

    // New validation for improved schema
    if (!body.customerId?.trim()) {
      return NextResponse.json({ error: 'Customer ID is required' }, { status: 400 });
    }

    if (!body.mitraId?.trim()) {
      return NextResponse.json({ error: 'Mitra ID is required' }, { status: 400 });
    }

    try {
      // Use the new utility function to create attendance record with populated data
      const result = await createAttendanceRecord({
        scheduleId: body.scheduleId || undefined,
        customerId: body.customerId,
        mitraId: body.mitraId,
        visitDate: body.visitDate ? new Date(body.visitDate) : new Date(),
        visitNumber: body.visitNumber || undefined,
        checkInTime: body.checkInTime ? new Date(body.checkInTime) : undefined,
        checkOutTime: body.checkOutTime ? new Date(body.checkOutTime) : undefined,
        status: body.status || 'Scheduled',
        notes: body.notes || undefined,
        workQuality: body.workQuality || undefined,
        actualDuration: body.actualDuration || undefined,
      });

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'ATTENDANCE_CREATED',
          userId: session.userId,
          email: session.email,
          details: {
            attendanceId: result.id,
            clientName: result.clientName,
            mitraCode: result.attendanceMitraCode,
            mitraName: result.attendanceMitraName,
          }
        });
      }

      return NextResponse.json({ 
        success: true,
        data: result,
        message: 'Attendance record created successfully with populated data'
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error during attendance creation:', dbError);
      
      // Fallback to legacy mock data approach if needed
      return NextResponse.json({ 
        success: false,
        error: `Failed to create attendance record: ${(dbError as Error).message}`
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Create attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const searchCustomerName = searchParams.get('customerName') || '';
    const searchPackage = searchParams.get('package') || '';
    const searchMitraName = searchParams.get('mitraName') || '';
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    console.log('📊 Fetching attendance/visits with filters:', {
      searchCustomerName,
      searchPackage,
      searchMitraName,
      fromDate,
      toDate,
      page,
      limit
    });

    try {
      // Build where conditions
      const conditions = [];

      if (searchCustomerName) {
        conditions.push(like(customerDB.customerName, `%${searchCustomerName}%`));
      }

      if (searchPackage) {
        conditions.push(like(customerDB.subscriptionPackage, `%${searchPackage}%`));
      }

      if (searchMitraName) {
        conditions.push(like(mitraDB.mitraName, `%${searchMitraName}%`));
      }

      if (fromDate) {
        conditions.push(gte(visitDB.scheduledDate, fromDate));
      }

      if (toDate) {
        conditions.push(lte(visitDB.scheduledDate, toDate));
      }

      // Fetch visits with customer and mitra data
      const visits = await db
        .select({
          id: visitDB.id,
          customerId: visitDB.customerId,
          customerName: customerDB.customerName,
          subscriptionPackage: customerDB.subscriptionPackage,
          mitraId: visitDB.actualMitraId,
          mitraName: mitraDB.mitraName,
          visitNumber: visitDB.visitNumber,
          scheduledDate: visitDB.scheduledDate,
          actualDate: visitDB.actualDate,
          status: visitDB.status,
          completedAt: visitDB.completedAt,
          createdAt: visitDB.createdAt,
        })
        .from(visitDB)
        .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
        .leftJoin(mitraDB, eq(visitDB.actualMitraId, mitraDB.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(visitDB.scheduledDate))
        .limit(limit)
        .offset(offset);

      console.log(`✅ Found ${visits.length} visits`);

      // Get total count for pagination
      const totalResult = await db
        .select({ count: count() })
        .from(visitDB)
        .leftJoin(customerDB, eq(visitDB.customerId, customerDB.id))
        .leftJoin(mitraDB, eq(visitDB.actualMitraId, mitraDB.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      const total = Number(totalResult[0]?.count || 0);
      const totalPages = Math.ceil(total / limit);

      // Transform data to match component expectations
      const transformedRecords = visits.map((visit, index) => {
        // Generate Invoice ID: INV/MitraName/Year.Month.Date-SequenceNumber
        let invoiceId = 'N/A';
        if (visit.scheduledDate && visit.visitNumber && visit.mitraName) {
          const date = new Date(visit.scheduledDate);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const sequence = String(visit.visitNumber).padStart(3, '0');
          // Use mitra name (cleaner name) in invoice ID
          const mitraName = visit.mitraName.replace(/\s+/g, ''); // Remove spaces from mitra name
          invoiceId = `INV/${mitraName}/${year}.${month}.${day}-${sequence}`;
        }

        return {
          id: visit.id || '',
          invoiceId: invoiceId,
          no: offset + index + 1,
          customerName: visit.customerName || 'N/A',
          mitraName: visit.mitraName || 'Not assigned',
          subscriptionPackage: visit.subscriptionPackage || 'N/A',
          visitStatus: visit.status || 'Scheduled',
          visitNumber: visit.visitNumber || 0,
          scheduledDate: visit.scheduledDate || '',
          actualDate: visit.actualDate || null,
          completedAt: visit.completedAt?.toISOString() || null,
          createdAt: visit.createdAt?.toISOString() || '',
        };
      });

      const response = {
        success: true,
        items: transformedRecords, // Component expects 'items'
        data: transformedRecords,   // Also provide 'data' for compatibility
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      };

      return NextResponse.json(response);

    } catch (dbError) {
      console.error('Database error during attendance retrieval:', dbError);

      // Return error response if database query fails
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to fetch attendance records',
          message: 'Database error occurred while fetching attendance data'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}