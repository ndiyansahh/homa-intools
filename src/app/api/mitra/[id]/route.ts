import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    
    try {
      // Try to get mitra from database first
      const result = await db
        .select({
          id: mitraDB.id,
          mitraName: mitraDB.mitraName,
          mitraCode: mitraDB.mitraCode,
          mitraNIK: mitraDB.mitraNIK,
          mitraGender: mitraDB.mitraGender,
          mitraDOB: mitraDB.mitraDOB,
          mitraPhone: mitraDB.mitraPhone,
          mitraBankAccount: mitraDB.mitraBankAccount,
          mitraBankHolderName: mitraDB.mitraBankHolderName,
          mitraBankAccountNumber: mitraDB.mitraBankAccountNumber,
          mitraCityAssignment: mitraDB.mitraCityAssignment,
          mitraLocationAssignment: mitraDB.mitraLocationAssignment,
          mitraPartnership: mitraDB.mitraPartnership,
          mitraTenure: mitraDB.mitraTenure,
          mitraExitDate: mitraDB.mitraExitDate,
          mitraBonusCommission: mitraDB.mitraBonusCommission,
          // Legacy fields
          contact: mitraDB.contact,
          address: mitraDB.address,
          city: mitraDB.city,
          district: mitraDB.district,
          status: mitraDB.status,
          joinDate: mitraDB.joinDate,
          createdAt: mitraDB.createdAt,
          updatedAt: mitraDB.updatedAt,
        })
        .from(mitraDB)
        .where(
          and(
            eq(mitraDB.id, id),
            or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (result.length > 0) {
        const dbMitra = result[0];
        
        // Convert database result to expected format
        const mitraData: MitraData = {
          id: dbMitra.id,
          joinDate: dbMitra.joinDate ? new Date(dbMitra.joinDate).toLocaleDateString('en-GB').replace(/\//g, '/') : (dbMitra.createdAt ? new Date(dbMitra.createdAt).toLocaleDateString('en-GB').replace(/\//g, '/') : ''),
          mitraCode: dbMitra.mitraCode || '',
          nik: dbMitra.mitraNIK || '',
          name: dbMitra.mitraName || '',
          gender: dbMitra.mitraGender || 'Wanita',
          bornDate: dbMitra.mitraDOB || '',
          address: dbMitra.address || '',
          phone: dbMitra.mitraPhone || dbMitra.contact || '',
          bankAccount: dbMitra.mitraBankAccount || '',
          bankAccountNumber: dbMitra.mitraBankAccountNumber || '',
          bankHoldersName: dbMitra.mitraBankHolderName || '',
          cityAssignment: dbMitra.mitraCityAssignment || dbMitra.city || '',
          locationAssignment: (() => {
            if (dbMitra.mitraLocationAssignment) {
              try {
                const parsed = JSON.parse(dbMitra.mitraLocationAssignment);
                return Array.isArray(parsed) ? parsed.join(', ') : dbMitra.mitraLocationAssignment;
              } catch {
                return dbMitra.mitraLocationAssignment;
              }
            }
            return dbMitra.district || '';
          })(),
          partnershipTypes: dbMitra.mitraPartnership as any || 'Full Time',
          status: dbMitra.status as any || 'ACTIVE',
          tenure: dbMitra.mitraTenure?.toString() || '0',
          exitDate: dbMitra.mitraExitDate || undefined,
          bonus: dbMitra.mitraBonusCommission as any || 'Eligible',
          createdAt: dbMitra.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: dbMitra.updatedAt?.toISOString() || new Date().toISOString(),
          isDeleted: false,
        };
        
        console.log(`✅ Found mitra in database: ${mitraData.name} (${mitraData.mitraCode})`);
        return NextResponse.json(mitraData);
      }
    } catch (dbError) {
      console.error('Database error, falling back to mock data:', dbError);
    }
    
    // Fallback to mock data if database lookup fails
    const mitra = mitraData.find(m => m.id === id && !m.isDeleted);

    if (!mitra) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    console.log(`🔄 Found mitra in mock data: ${mitra.name} (${mitra.mitraCode})`);
    return NextResponse.json(mitra);
  } catch (error) {
    console.error('Get mitra details error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/mitra/[id] - Update mitra
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can update
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body: Partial<UpdateMitraRequest> = await request.json();

    const mitraIndex = mitraData.findIndex(m => m.id === id && !m.isDeleted);
    if (mitraIndex === -1) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    // Check NIK uniqueness if NIK is being updated
    if (body.mitraNIK && body.mitraNIK !== mitraData[mitraIndex].nik) {
      if (mitraData.some(m => m.nik === body.mitraNIK && m.id !== id && !m.isDeleted)) {
        return NextResponse.json({ error: 'NIK already exists' }, { status: 400 });
      }
    }

    // Validate date format if dates are being updated
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (body.mitraDOB && !dateRegex.test(body.mitraDOB)) {
      return NextResponse.json({ 
        error: 'Invalid born date format. Use dd/MM/yyyy format' 
      }, { status: 400 });
    }

    if (body.mitraExitDate && !dateRegex.test(body.mitraExitDate)) {
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
    if (session) {
      await logAuditEvent({
        action: 'MITRA_UPDATED',
        userId: session.userId,
        email: session.email,
        details: {
          mitraId: updatedMitra.id,
          mitraCode: updatedMitra.mitraCode,
          name: updatedMitra.name,
          nik: updatedMitra.nik,
          updatedFields: Object.keys(body),
        }
      });
    }

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can delete
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
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
    if (session) {
      await logAuditEvent({
        action: 'MITRA_DELETED',
        userId: session.userId,
        email: session.email,
        details: {
          mitraId: mitraData[mitraIndex].id,
          mitraCode: mitraData[mitraIndex].mitraCode,
          name: mitraData[mitraIndex].name,
          nik: mitraData[mitraIndex].nik,
        }
      });
    }

    return NextResponse.json({ message: 'Mitra deleted successfully' });
  } catch (error) {
    console.error('Delete mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}