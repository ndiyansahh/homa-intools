import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { UpdateMitraRequest, MitraData } from '@/types/mitra';
import { logAuditEvent } from '@/lib/logger';

// Mock data storage (replace with real database)
// Import from parent route to maintain data consistency
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

// GET /api/mitra/[id] - Get individual mitra details
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const mitra = mitraData.find(m => m.id === id && !m.isDeleted);

    if (!mitra) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    return NextResponse.json(mitra);
  } catch (error) {
    console.error('Get mitra details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/mitra/[id] - Update mitra
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const body: Partial<UpdateMitraRequest> = await request.json();

    const mitraIndex = mitraData.findIndex(m => m.id === id && !m.isDeleted);
    if (mitraIndex === -1) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    // Check NIK uniqueness if NIK is being updated
    if (body.nik && body.nik !== mitraData[mitraIndex].nik) {
      if (mitraData.some(m => m.nik === body.nik && m.id !== id && !m.isDeleted)) {
        return NextResponse.json({ error: 'NIK already exists' }, { status: 400 });
      }
    }

    // Validate date format if dates are being updated
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (body.bornDate && !dateRegex.test(body.bornDate)) {
      return NextResponse.json({ 
        error: 'Invalid born date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (body.exitDate && !dateRegex.test(body.exitDate)) {
      return NextResponse.json({ 
        error: 'Invalid exit date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    // Update the mitra
    const updatedMitra = {
      ...mitraData[mitraIndex],
      ...body,
      updatedAt: new Date().toISOString(),
    };

    mitraData[mitraIndex] = updatedMitra;

    // Log audit event
    logAuditEvent({
      action: 'mitra_updated',
      userId: session.userId,
      email: session.email,
      details: {
        mitraId: updatedMitra.id,
        mitraCode: updatedMitra.mitraCode,
        name: updatedMitra.name,
        nik: updatedMitra.nik,
        updatedFields: Object.keys(body),
      },
    });

    return NextResponse.json({ 
      id: updatedMitra.id,
      message: 'Mitra updated successfully' 
    });
  } catch (error) {
    console.error('Update mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/mitra/[id] - Soft delete mitra
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const { id } = params;
    const mitraIndex = mitraData.findIndex(m => m.id === id && !m.isDeleted);

    if (mitraIndex === -1) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    // Soft delete
    mitraData[mitraIndex] = {
      ...mitraData[mitraIndex],
      isDeleted: true,
      updatedAt: new Date().toISOString(),
    };

    // Log audit event
    logAuditEvent({
      action: 'mitra_deleted',
      userId: session.userId,
      email: session.email,
      details: {
        mitraId: mitraData[mitraIndex].id,
        mitraCode: mitraData[mitraIndex].mitraCode,
        name: mitraData[mitraIndex].name,
        nik: mitraData[mitraIndex].nik,
      },
    });

    return NextResponse.json({ message: 'Mitra deleted successfully' });
  } catch (error) {
    console.error('Delete mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}