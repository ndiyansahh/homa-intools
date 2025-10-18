import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CreateAttendanceRequest, AttendanceRecord, AttendanceResponse } from '@/types/customer';
import { logAuditEvent } from '@/lib/logger';

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
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateAttendanceRequest = await request.json();

    // Validation
    if (!body.clientName?.trim()) {
      return NextResponse.json({ error: 'Client name is required' }, { status: 400 });
    }

    if (!body.address?.trim()) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 });
    }

    if (!body.package?.trim()) {
      return NextResponse.json({ error: 'Package is required' }, { status: 400 });
    }

    if (!body.cleaner1?.trim()) {
      return NextResponse.json({ error: 'At least cleaner1 is required' }, { status: 400 });
    }

    // Validate date format (dd/MM/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(body.startDate)) {
      return NextResponse.json({ 
        error: 'Invalid start date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (!dateRegex.test(body.endDate)) {
      return NextResponse.json({ 
        error: 'Invalid end date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (body.newEndDate && !dateRegex.test(body.newEndDate)) {
      return NextResponse.json({ 
        error: 'Invalid new end date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    const nextNo = Math.max(...attendanceData.map(a => a.no), 0) + 1;

    const newAttendance: AttendanceRecord = {
      id: Date.now().toString(),
      no: nextNo,
      clientName: body.clientName.trim(),
      address: body.address.trim(),
      package: body.package.trim(),
      startDate: body.startDate,
      endDate: body.endDate,
      newEndDate: body.newEndDate?.trim(),
      cleaner1: body.cleaner1.trim(),
      cleaner2: body.cleaner2?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    attendanceData.push(newAttendance);

    // Log audit event
    logAuditEvent({
      action: 'attendance_created',
      userId: session.userId,
      email: session.email,
      details: {
        attendanceId: newAttendance.id,
        clientName: newAttendance.clientName,
        package: newAttendance.package,
      },
    });

    return NextResponse.json({ id: newAttendance.id }, { status: 201 });
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
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter attendance (exclude soft deleted by default)
    let filteredAttendance = attendanceData.filter(attendance => !attendance.isDeleted);

    // Apply search filters
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredAttendance = filteredAttendance.filter(attendance =>
        attendance.clientName.toLowerCase().includes(searchTerm) ||
        attendance.address.toLowerCase().includes(searchTerm) ||
        attendance.package.toLowerCase().includes(searchTerm) ||
        attendance.cleaner1.toLowerCase().includes(searchTerm) ||
        attendance.cleaner2.toLowerCase().includes(searchTerm)
      );
    }

    // Sort by creation date (newest first)
    filteredAttendance.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const total = filteredAttendance.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedItems = filteredAttendance.slice(offset, offset + limit);

    const response: AttendanceResponse = {
      items: paginatedItems,
      page,
      total,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}