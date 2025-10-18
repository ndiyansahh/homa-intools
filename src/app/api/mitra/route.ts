import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { CreateMitraRequest, MitraListItem, MitraResponse, MitraData } from '@/types/mitra';
import { logAuditEvent } from '@/lib/logger';

// Mock data storage (replace with real database)
let mitraData: MitraData[] = [
  {
    id: '1',
    joinDate: '15/10/2022',
    mitraCode: 'MITRA-202210-000001',
    nik: '3171081506950002',
    name: 'Syeila Nurhasanah',
    gender: 'Wanita',
    bornDate: '15/06/1995',
    address: 'Jl. Kebon Jeruk No. 123, Jakarta Barat',
    phone: '6281291662589',
    bankAccount: 'BCA',
    bankAccountNumber: '5271236489',
    bankHoldersName: 'Syeila Nurhasanah',
    cityAssignment: 'Jakarta',
    locationAssignment: 'Jakarta Barat',
    partnershipTypes: 'Fulltime',
    status: 'ACTIVE',
    tenure: '12',
    bonus: 'Eligible',
    createdAt: '2022-10-15T10:00:00Z',
    updatedAt: '2022-10-15T10:00:00Z',
    isDeleted: false,
  },
  {
    id: '2',
    joinDate: '20/10/2022',
    mitraCode: 'MITRA-202210-000002',
    nik: '3172082107880003',
    name: 'Ahmad Rizki',
    gender: 'Pria',
    bornDate: '21/07/1988',
    address: 'Jl. Sudirman No. 456, Jakarta Pusat',
    phone: '6281234567890',
    bankAccount: 'Mandiri',
    bankAccountNumber: '1234567890',
    bankHoldersName: 'Ahmad Rizki',
    cityAssignment: 'Jakarta',
    locationAssignment: 'Jakarta Pusat',
    partnershipTypes: 'Partime',
    status: 'ACTIVE',
    tenure: '6',
    bonus: 'Eligible',
    createdAt: '2022-10-20T14:30:00Z',
    updatedAt: '2022-10-20T14:30:00Z',
    isDeleted: false,
  },
  {
    id: '3',
    joinDate: '25/11/2022',
    mitraCode: 'MITRA-202211-000001',
    nik: '3173081203920001',
    name: 'Sari Indah',
    gender: 'Wanita',
    bornDate: '12/03/1992',
    address: 'Jl. Gatot Subroto No. 789, Jakarta Selatan',
    phone: '6281987654321',
    bankAccount: 'BNI',
    bankAccountNumber: '9876543210',
    bankHoldersName: 'Sari Indah',
    cityAssignment: 'Jakarta',
    locationAssignment: 'Jakarta Selatan',
    partnershipTypes: 'Fulltime',
    status: 'ACTIVE-FLAG',
    tenure: '3',
    exitDate: '25/11/2025',
    bonus: 'Not Eligible',
    createdAt: '2022-11-25T09:15:00Z',
    updatedAt: '2025-10-01T10:00:00Z',
    isDeleted: false,
  },
  {
    id: '4',
    joinDate: '01/12/2022',
    mitraCode: 'MITRA-202212-000001',
    nik: '3174081809850004',
    name: 'Budi Santoso',
    gender: 'Pria',
    bornDate: '18/09/1985',
    address: 'Jl. Thamrin No. 321, Jakarta Utara',
    phone: '6281555666777',
    bankAccount: 'BCA',
    bankAccountNumber: '7777666555',
    bankHoldersName: 'Budi Santoso',
    cityAssignment: 'Jakarta',
    locationAssignment: 'Jakarta Utara',
    partnershipTypes: 'Partime',
    status: 'EXIT',
    tenure: '6',
    exitDate: '01/06/2025',
    bonus: 'Not Eligible',
    createdAt: '2022-12-01T11:20:00Z',
    updatedAt: '2025-06-01T16:00:00Z',
    isDeleted: false,
  }
];

const generateMitraCode = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const count = mitraData.filter(m => !m.isDeleted).length + 1;
  const sequence = String(count).padStart(6, '0');
  return `MITRA-${year}${month}-${sequence}`;
};

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

    const body: CreateMitraRequest = await request.json();

    // Validation
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    if (!body.nik?.trim()) {
      return NextResponse.json({ error: 'NIK is required' }, { status: 400 });
    }

    // Check NIK uniqueness
    if (mitraData.some(m => m.nik === body.nik && !m.isDeleted)) {
      return NextResponse.json({ error: 'NIK already exists' }, { status: 400 });
    }

    // Validate date format (dd/MM/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!dateRegex.test(body.bornDate)) {
      return NextResponse.json({ 
        error: 'Invalid born date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (body.exitDate && !dateRegex.test(body.exitDate)) {
      return NextResponse.json({ 
        error: 'Invalid exit date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    const newMitra: MitraData = {
      id: Date.now().toString(),
      joinDate: new Date().toLocaleDateString('en-GB', {
        timeZone: 'Asia/Jakarta',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '/'),
      mitraCode: generateMitraCode(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDeleted: false,
    };

    mitraData.push(newMitra);

    // Log audit event
    logAuditEvent({
      action: 'mitra_created',
      userId: session.userId,
      email: session.email,
      details: {
        mitraId: newMitra.id,
        mitraCode: newMitra.mitraCode,
        name: newMitra.name,
        nik: newMitra.nik,
      },
    });

    return NextResponse.json({ 
      id: newMitra.id,
      mitraCode: newMitra.mitraCode 
    }, { status: 201 });
  } catch (error) {
    console.error('Create mitra error:', error);
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
    const status = searchParams.get('status') || '';
    const partnershipType = searchParams.get('partnershipType') || '';
    const city = searchParams.get('city') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Filter mitra (exclude soft deleted by default)
    let filteredMitra = mitraData.filter(mitra => !mitra.isDeleted);

    // Apply search filters
    if (q) {
      const searchTerm = q.toLowerCase();
      filteredMitra = filteredMitra.filter(mitra =>
        mitra.name.toLowerCase().includes(searchTerm) ||
        mitra.mitraCode.toLowerCase().includes(searchTerm) ||
        mitra.nik.includes(searchTerm) ||
        mitra.phone.includes(searchTerm)
      );
    }

    if (status) {
      filteredMitra = filteredMitra.filter(mitra => mitra.status === status);
    }

    if (partnershipType) {
      filteredMitra = filteredMitra.filter(mitra => mitra.partnershipTypes === partnershipType);
    }

    if (city) {
      filteredMitra = filteredMitra.filter(mitra =>
        mitra.cityAssignment.toLowerCase().includes(city.toLowerCase()) ||
        mitra.locationAssignment.toLowerCase().includes(city.toLowerCase())
      );
    }

    // Sort by join date (newest first)
    filteredMitra.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Pagination
    const total = filteredMitra.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    
    const items: MitraListItem[] = filteredMitra.slice(offset, offset + limit).map(mitra => ({
      id: mitra.id,
      joinDate: mitra.joinDate,
      name: mitra.name,
      nik: mitra.nik,
      mitraCode: mitra.mitraCode,
      address: mitra.address,
      phone: mitra.phone,
      bankAccount: mitra.bankAccount,
      bankAccountNumber: mitra.bankAccountNumber,
      bankHoldersName: mitra.bankHoldersName,
      status: mitra.status,
      partnershipTypes: mitra.partnershipTypes,
      cityAssignment: mitra.cityAssignment,
    }));

    const response: MitraResponse = {
      items,
      page,
      total,
      totalPages,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}