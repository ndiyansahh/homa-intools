import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { UpdateAttendanceRequest, AttendanceRecord } from '@/types/customer';
import { logAuditEvent } from '@/lib/logger';

// Import attendance data from main route - in production this would be from database
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

// GET /api/attendance/[id] - Get individual attendance record
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const attendance = attendanceData.find(a => a.id === id && !a.isDeleted);

    if (!attendance) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    return NextResponse.json(attendance);
  } catch (error) {
    console.error('Get attendance details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/attendance/[id] - Update attendance record
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can update
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body: Partial<UpdateAttendanceRequest> = await request.json();

    const attendanceIndex = attendanceData.findIndex(a => a.id === id && !a.isDeleted);
    if (attendanceIndex === -1) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Validate date formats if dates are being updated
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (body.startDate && !dateRegex.test(body.startDate)) {
      return NextResponse.json({ 
        error: 'Invalid start date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (body.endDate && !dateRegex.test(body.endDate)) {
      return NextResponse.json({ 
        error: 'Invalid end date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (body.newEndDate && !dateRegex.test(body.newEndDate)) {
      return NextResponse.json({ 
        error: 'Invalid new end date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    // Update the attendance record
    const updatedAttendance = {
      ...attendanceData[attendanceIndex],
      ...body,
      updatedAt: new Date().toISOString(),
      updatedBy: session.email, // Record who made the update
    };

    attendanceData[attendanceIndex] = updatedAttendance;

    // Log audit event
    logAuditEvent({
      action: 'attendance_updated',
      userId: session.userId,
      email: session.email,
      details: {
        attendanceId: updatedAttendance.id,
        clientName: updatedAttendance.clientName,
        updatedFields: Object.keys(body),
        updatedBy: session.email,
      },
    });

    return NextResponse.json({ 
      id: updatedAttendance.id,
      message: 'Attendance record updated successfully' 
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/attendance/[id] - Soft delete attendance record
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can delete
    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const attendanceIndex = attendanceData.findIndex(a => a.id === id && !a.isDeleted);

    if (attendanceIndex === -1) {
      return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
    }

    // Soft delete
    attendanceData[attendanceIndex] = {
      ...attendanceData[attendanceIndex],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    // Log audit event
    logAuditEvent({
      action: 'attendance_deleted',
      userId: session.userId,
      email: session.email,
      details: {
        attendanceId: attendanceData[attendanceIndex].id,
        clientName: attendanceData[attendanceIndex].clientName,
      },
    });

    return NextResponse.json({ message: 'Attendance record deleted successfully' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}