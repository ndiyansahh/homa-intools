import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB, attendanceScheduleDB } from '@/lib/schema';
import { sql, and, or, ilike, eq, desc, count, not, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { CreateMitraRequest, MitraListItem, MitraResponse, MitraData, MitraGender, MitraPartnershipType, MitraStatus, MitraBonusCommission, MitraCityAssignment } from '@/types/mitra';
import { logAuditEvent } from '@/lib/logger';

// Simple interface for available mitra response
interface AvailableMitra {
  id: string;
  name: string;
  phone: string;
}

// Get available mitra (cleaners) - simplified response
async function getAvailableMitra(availableDate: string | null): Promise<NextResponse> {
  try {
    let conditions = [
      eq(mitraDB.status, 'Active'),
      or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
    ];

    // If available_date is provided, filter out mitra who have conflicts
    if (availableDate) {
      // Validate date format (YYYY-MM-DD)
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(availableDate)) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format' },
          { status: 400 }
        );
      }

      try {
        // Get mitra IDs that have conflicts on the specified date
        const conflictedMitra = await db
          .select({ mitraId: attendanceScheduleDB.mitraId })
          .from(attendanceScheduleDB)
          .where(
            and(
              sql`DATE(${attendanceScheduleDB.scheduledDate}) = ${availableDate}`,
              or(eq(attendanceScheduleDB.isDeleted, false), sql`${attendanceScheduleDB.isDeleted} IS NULL`),
              or(
                eq(attendanceScheduleDB.status, 'Scheduled'),
                eq(attendanceScheduleDB.status, 'In-Progress')
              )
            )
          );

        // Extract mitra IDs that are busy
        const busyMitraIds = conflictedMitra.map(m => m.mitraId).filter(id => id);

        // If there are busy mitra, exclude them
        if (busyMitraIds.length > 0) {
          conditions.push(not(inArray(mitraDB.id, busyMitraIds)));
        }
      } catch (scheduleError) {
        console.error('Error checking schedule conflicts:', scheduleError);
        // Continue without date filter if there's an error
      }
    }

    // Get available mitra from database with new schema
    const result = await db
      .select({
        id: mitraDB.id,
        name: mitraDB.mitraName,
        phone: mitraDB.mitraPhone,
        contact: mitraDB.contact, // Legacy fallback
      })
      .from(mitraDB)
      .where(and(...conditions))
      .orderBy(sql`${mitraDB.mitraName} ASC`);

    const availableMitra: AvailableMitra[] = result.map(mitra => ({
      id: mitra.id,
      name: mitra.name || 'Unknown',
      phone: mitra.phone || mitra.contact || '', // Use new field with fallback
    }));

    return NextResponse.json(availableMitra);

  } catch (dbError) {
    console.error('Database error in getAvailableMitra:', dbError);
    
    // Fallback to mock data for available mitra
    const mockAvailable = mitraData
      .filter(m => m.status === 'ACTIVE' && !m.isDeleted)
      .map(m => ({
        id: m.id,
        name: m.name,
        phone: m.phone
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return NextResponse.json(mockAvailable);
  }
}

// Mock data storage (replace with real database) - Updated to match new schema
let mitraData: any[] = [
  {
    id: '1',
    joinDate: '15/10/2022',
    mitraCode: 'MITRA-202210-000001',
    name: 'Syeila Nurhasanah', // Legacy field for compatibility
    nik: '3171081506950002', // Legacy field for compatibility
    gender: 'Wanita', // Legacy field for compatibility
    bornDate: '06/15/1995', // Legacy field for compatibility
    address: 'Jl. Kebon Jeruk No. 123, Jakarta Barat',
    phone: '081291662589',
    bankAccount: 'BCA',
    bankAccountNumber: '5271236489',
    bankHoldersName: 'Syeila Nurhasanah',
    cityAssignment: 'Jakarta Barat',
    locationAssignment: 'Jakarta Barat',
    partnershipTypes: 'Full Time',
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
    name: 'Ahmad Rizki', // Legacy field for compatibility
    nik: '3172082107880003', // Legacy field for compatibility
    gender: 'Pria', // Legacy field for compatibility
    bornDate: '07/21/1988', // Legacy field for compatibility
    address: 'Jl. Sudirman No. 456, Jakarta Pusat',
    phone: '081234567890',
    bankAccount: 'Mandiri',
    bankAccountNumber: '1234567890',
    bankHoldersName: 'Ahmad Rizki',
    cityAssignment: 'Jakarta Pusat',
    locationAssignment: 'Jakarta Pusat',
    partnershipTypes: 'Part Time',
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

const generateMitraCode = async (): Promise<string> => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const yearMonth = `${year}${month}`;
  
  try {
    // Count existing mitras in database created in the same month for sequence number
    console.log(`🔍 Generating mitraCode for ${yearMonth}...`);
    
    const countResult = await db
      .select({ count: count() })
      .from(mitraDB)
      .where(
        and(
          sql`${mitraDB.mitraCode} LIKE ${`MITRA-${yearMonth}-%`}`,
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      );
    
    const monthlyCount = countResult[0]?.count || 0;
    console.log(`📊 Found ${monthlyCount} existing mitras for ${yearMonth}`);
    
    const sequence = String(monthlyCount + 1).padStart(6, '0');
    const newCode = `MITRA-${yearMonth}-${sequence}`;
    
    console.log(`✅ Generated mitraCode: ${newCode}`);
    return newCode;
    
  } catch (error) {
    console.error('❌ Database error in mitraCode generation, using fallback:', error);
    
    // Fallback to mock data count for current month
    const mockCount = mitraData.filter(m => !m.isDeleted && m.mitraCode && m.mitraCode.includes(yearMonth)).length;
    const sequence = String(mockCount + 1).padStart(6, '0');
    const fallbackCode = `MITRA-${yearMonth}-${sequence}`;
    
    console.log(`🔄 Fallback mitraCode: ${fallbackCode}`);
    return fallbackCode;
  }
};

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can create
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body: CreateMitraRequest = await request.json();

    // Comprehensive validation for new schema
    if (!body.mitraName?.trim()) {
      return NextResponse.json({ error: 'Mitra name is required' }, { status: 400 });
    }

    if (!body.mitraNIK?.trim()) {
      return NextResponse.json({ error: 'Mitra NIK is required' }, { status: 400 });
    }

    // Validate NIK format (exactly 16 digits)
    if (!/^\d{16}$/.test(body.mitraNIK)) {
      return NextResponse.json({ 
        error: 'NIK must be exactly 16 digits' 
      }, { status: 400 });
    }

    // Validate phone format (10-12 digits)
    if (!body.mitraPhone?.trim() || !/^\d{10,12}$/.test(body.mitraPhone)) {
      return NextResponse.json({ 
        error: 'Phone must be 10-12 digits' 
      }, { status: 400 });
    }

    // Validate gender enum
    if (!body.mitraGender || !['Pria', 'Wanita'].includes(body.mitraGender)) {
      return NextResponse.json({ 
        error: 'Gender must be either "Pria" or "Wanita"' 
      }, { status: 400 });
    }

    // Validate date format (mm/dd/yyyy)
    const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (!body.mitraDOB || !dateRegex.test(body.mitraDOB)) {
      return NextResponse.json({ 
        error: 'Invalid birth date format. Use mm/dd/yyyy format' 
      }, { status: 400 });
    }

    // Validate age (must be at least 17 years old)
    const dobParts = body.mitraDOB.split('/');
    if (dobParts.length === 3) {
      const [month, day, year] = dobParts.map(Number);
      const birthDate = new Date(year, month - 1, day); // month is 0-indexed
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      
      // Adjust age if birthday hasn't occurred this year
      const actualAge = (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) 
        ? age - 1 
        : age;
      
      if (actualAge < 17) {
        return NextResponse.json({ 
          error: 'Mitra must be at least 17 years old for employment eligibility' 
        }, { status: 400 });
      }
      
      if (actualAge > 80) {
        return NextResponse.json({ 
          error: 'Please verify the date of birth. Age appears to be over 80 years.' 
        }, { status: 400 });
      }
    }

    // Validate exit date format (dd/mm/yyyy) if provided
    const exitDateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
    if (body.mitraExitDate && !exitDateRegex.test(body.mitraExitDate)) {
      return NextResponse.json({ 
        error: 'Invalid exit date format. Use dd/mm/yyyy format' 
      }, { status: 400 });
    }

    // Validate partnership type
    if (!body.mitraPartnership || !['Full Time', 'Part Time'].includes(body.mitraPartnership)) {
      return NextResponse.json({ 
        error: 'Partnership type must be "Full Time" or "Part Time"' 
      }, { status: 400 });
    }

    // Validate bonus commission
    if (!body.mitraBonusCommission || !['Eligible', 'Not Eligible'].includes(body.mitraBonusCommission)) {
      return NextResponse.json({ 
        error: 'Bonus commission must be "Eligible" or "Not Eligible"' 
      }, { status: 400 });
    }

    // Validate required banking information
    if (!body.mitraBankAccount?.trim()) {
      return NextResponse.json({ error: 'Bank account is required' }, { status: 400 });
    }

    if (!body.mitraBankHolderName?.trim()) {
      return NextResponse.json({ error: 'Bank holder name is required' }, { status: 400 });
    }

    if (!body.mitraBankAccountNumber?.trim()) {
      return NextResponse.json({ error: 'Bank account number is required' }, { status: 400 });
    }

    // Validate city assignment
    const validCities: MitraCityAssignment[] = ['Jakarta', 'Bogor', 'Depok', 'Tangerang', 'Bekasi', 'Jakarta Pusat', 'Jakarta Barat', 'Jakarta Timur', 'Jakarta Selatan', 'Jakarta Utara'];
    if (!body.mitraCityAssignment || !validCities.includes(body.mitraCityAssignment)) {
      return NextResponse.json({ 
        error: `City assignment must be one of: ${validCities.join(', ')}` 
      }, { status: 400 });
    }

    // Validate location assignment (array of districts)
    if (!body.mitraLocationAssignment || !Array.isArray(body.mitraLocationAssignment) || body.mitraLocationAssignment.length === 0) {
      return NextResponse.json({ 
        error: 'Location assignment must be a non-empty array of districts' 
      }, { status: 400 });
    }

    // Validate tenure is a number
    if (body.mitraTenure !== undefined && (typeof body.mitraTenure !== 'number' || body.mitraTenure < 0)) {
      return NextResponse.json({ 
        error: 'Tenure must be a non-negative number' 
      }, { status: 400 });
    }

    try {
      // Check NIK uniqueness with the new schema
      const existingNik = await db
        .select({ id: mitraDB.id })
        .from(mitraDB)
        .where(
          and(
            eq(mitraDB.mitraNIK, body.mitraNIK),
            or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (existingNik.length > 0) {
        return NextResponse.json({ error: 'NIK already exists' }, { status: 400 });
      }

      const mitraCode = await generateMitraCode();

      // Create mitra in database with new comprehensive schema
      const newMitraData = {
        mitraName: body.mitraName.trim(),
        
        // Core identification
        mitraCode: mitraCode,
        mitraNIK: body.mitraNIK.trim(),
        mitraGender: body.mitraGender,
        mitraDOB: body.mitraDOB,
        mitraPhone: body.mitraPhone.trim(),
        
        // Legacy contact and address (for backward compatibility)
        contact: body.mitraPhone.trim(), // Legacy field
        address: body.address?.trim() || '',
        city: body.mitraCityAssignment, // Legacy field
        district: body.mitraLocationAssignment[0] || '', // First district as legacy
        village: null,
        postalCode: null,
        
        // Banking information
        mitraBankAccount: body.mitraBankAccount.trim(),
        mitraBankHolderName: body.mitraBankHolderName.trim(),
        mitraBankAccountNumber: body.mitraBankAccountNumber.trim(),
        
        // Assignment details
        mitraCityAssignment: body.mitraCityAssignment,
        mitraLocationAssignment: JSON.stringify(body.mitraLocationAssignment),
        mitraPartnership: body.mitraPartnership,
        mitraTenure: body.mitraTenure || 0,
        mitraExitDate: body.mitraExitDate || null,
        mitraBonusCommission: body.mitraBonusCommission,
        
        // Legacy mitra details
        mitraType: 'Cleaner',
        status: body.status || 'Active',
        
        // Financial details
        baseRate: '50000.00', // Default base rate
        commissionRate: '10.00', // Default commission rate
        totalEarnings: '0',
        totalVisits: 0,
        
        // Performance metrics
        rating: '0',
        totalReviews: 0,
        
        // Metadata
        mitraNotes: null,
        isActive: true,
        isDeleted: false,
      };

      const result = await db
        .insert(mitraDB)
        .values(newMitraData)
        .returning({ id: mitraDB.id, mitraName: mitraDB.mitraName });

      const newMitraId = result[0]?.id;
      const newMitraName = result[0]?.mitraName;

      if (!newMitraId) {
        return NextResponse.json({ error: 'Failed to create mitra' }, { status: 500 });
      }

      // Log audit event
      if (session) {
        await logAuditEvent({
          action: 'MITRA_CREATED',
          userId: session.userId,
          email: session.email,
          details: {
            mitraId: newMitraId,
            mitraName: newMitraName,
            mitraCode: mitraCode,
            mitraNIK: body.mitraNIK.trim(),
            mitraGender: body.mitraGender,
            mitraPartnership: body.mitraPartnership,
            mitraCityAssignment: body.mitraCityAssignment
          }
        });
      }

      return NextResponse.json({ 
        success: true,
        data: { 
          id: newMitraId, 
          mitraName: newMitraName,
          mitraCode: mitraCode,
          mitraNIK: body.mitraNIK,
          mitraGender: body.mitraGender,
          mitraPartnership: body.mitraPartnership
        },
        message: 'Mitra created successfully'
      }, { status: 201 });

    } catch (dbError) {
      console.error('Database error during mitra creation:', dbError);
      
      // Fallback to mock data behavior
      if (mitraData.some(m => m.nik === body.mitraNIK && !m.isDeleted)) {
        return NextResponse.json({ error: 'NIK already exists' }, { status: 400 });
      }

      const mitraCode = await generateMitraCode();
      const newMitra: any = {
        id: Date.now().toString(),
        joinDate: new Date().toLocaleDateString('en-GB', {
          timeZone: 'Asia/Jakarta',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '/'),
        mitraCode: mitraCode,
        name: body.mitraName,
        nik: body.mitraNIK,
        gender: body.mitraGender,
        bornDate: body.mitraDOB,
        phone: body.mitraPhone,
        bankAccount: body.mitraBankAccount,
        bankHoldersName: body.mitraBankHolderName,
        bankAccountNumber: body.mitraBankAccountNumber,
        cityAssignment: body.mitraCityAssignment,
        locationAssignment: body.mitraLocationAssignment.join(', '),
        partnershipTypes: body.mitraPartnership,
        status: body.status || 'Active',
        tenure: body.mitraTenure?.toString() || '0',
        bonus: body.mitraBonusCommission,
        exitDate: body.mitraExitDate,
        address: body.address || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDeleted: false,
      };

      mitraData.push(newMitra);

      return NextResponse.json({ 
        success: true,
        data: { 
          id: newMitra.id, 
          mitraCode: newMitra.mitraCode,
          mitraName: body.mitraName,
          mitraNIK: body.mitraNIK
        },
        message: 'Mitra created successfully (using mock data)'
      }, { status: 201 });
    }

  } catch (error) {
    console.error('Create mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const availableDate = searchParams.get('available_date');
    
    // Check if this is a simple mitra list request (for available cleaners)
    if (availableDate !== null || searchParams.size === 0 || (searchParams.size === 1 && availableDate)) {
      return await getAvailableMitra(availableDate);
    }
    
    // Original complex filtering logic for full mitra management
    const q = searchParams.get('q') || '';
    const status = searchParams.get('status') || '';
    const partnershipType = searchParams.get('partnershipType') || '';
    const city = searchParams.get('city') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const offset = (page - 1) * limit;

    let mitras: MitraListItem[] = [];
    let total = 0;

    try {
      // Build where conditions
      const conditions = [];
      
      // Search in name, mitra code, nik, or phone with new schema
      if (q) {
        conditions.push(
          or(
            ilike(mitraDB.mitraName, `%${q}%`),
            ilike(mitraDB.mitraCode, `%${q}%`),
            ilike(mitraDB.mitraNIK, `%${q}%`),
            ilike(mitraDB.mitraPhone, `%${q}%`),
            ilike(mitraDB.contact, `%${q}%`), // Legacy fallback
            ilike(mitraDB.address, `%${q}%`)
          )
        );
      }

      // Status filter
      if (status) {
        conditions.push(eq(mitraDB.status, status));
      }

      // Partnership type filter with new schema
      if (partnershipType) {
        conditions.push(eq(mitraDB.mitraPartnership, partnershipType));
      }

      // City filter with new schema
      if (city) {
        conditions.push(
          or(
            ilike(mitraDB.mitraCityAssignment, `%${city}%`),
            ilike(mitraDB.city, `%${city}%`) // Legacy fallback
          )
        );
      }

      // Add soft delete condition (only show non-deleted)
      conditions.push(or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const countResult = await db
        .select({ count: count() })
        .from(mitraDB)
        .where(whereClause);
      
      total = countResult[0]?.count || 0;

      // Get paginated mitras from database with new schema fields
      const result = await db
        .select({
          id: mitraDB.id,
          mitraName: mitraDB.mitraName,
          mitraCode: mitraDB.mitraCode,
          mitraNIK: mitraDB.mitraNIK,
          mitraGender: mitraDB.mitraGender,
          mitraDOB: mitraDB.mitraDOB,
          mitraPhone: mitraDB.mitraPhone,
          contact: mitraDB.contact,
          address: mitraDB.address,
          city: mitraDB.city,
          district: mitraDB.district,
          mitraBankAccount: mitraDB.mitraBankAccount,
          mitraBankHolderName: mitraDB.mitraBankHolderName,
          mitraBankAccountNumber: mitraDB.mitraBankAccountNumber,
          mitraCityAssignment: mitraDB.mitraCityAssignment,
          mitraLocationAssignment: mitraDB.mitraLocationAssignment,
          mitraPartnership: mitraDB.mitraPartnership,
          mitraTenure: mitraDB.mitraTenure,
          mitraExitDate: mitraDB.mitraExitDate,
          mitraBonusCommission: mitraDB.mitraBonusCommission,
          status: mitraDB.status,
          joinDate: mitraDB.joinDate,
          createdAt: mitraDB.createdAt,
        })
        .from(mitraDB)
        .where(whereClause)
        .orderBy(desc(mitraDB.createdAt))
        .limit(limit)
        .offset(offset);

      mitras = result.map(mitra => ({
        id: mitra.id,
        joinDate: mitra.joinDate ? new Date(mitra.joinDate).toLocaleDateString('en-GB').replace(/\//g, '/') : (mitra.createdAt ? new Date(mitra.createdAt).toLocaleDateString('en-GB').replace(/\//g, '/') : new Date().toLocaleDateString('en-GB').replace(/\//g, '/')),
        name: mitra.mitraName || '',
        nik: mitra.mitraNIK || '',
        mitraCode: mitra.mitraCode || '',
        address: mitra.address || '',
        phone: mitra.mitraPhone || mitra.contact || '',
        bankAccount: mitra.mitraBankAccount || '',
        bankAccountNumber: mitra.mitraBankAccountNumber || '',
        bankHoldersName: mitra.mitraBankHolderName || '',
        status: mitra.status as any || 'ACTIVE',
        partnershipTypes: mitra.mitraPartnership as any || 'Full Time',
        cityAssignment: mitra.mitraCityAssignment || mitra.city || '',
        locationAssignment: mitra.mitraLocationAssignment ? (typeof mitra.mitraLocationAssignment === 'string' ? mitra.mitraLocationAssignment : JSON.stringify(mitra.mitraLocationAssignment)) : (mitra.district || ''),
      }));

    } catch (dbError) {
      console.error('Database error, using mock data:', dbError);
      
      // Fallback to mock data
      let filteredMitra = mitraData.filter(mitra => !mitra.isDeleted);

      // Apply mock data filters
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

      total = filteredMitra.length;
      const items = filteredMitra.slice(offset, offset + limit);
      
      mitras = items.map(mitra => ({
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
        locationAssignment: mitra.locationAssignment || '',
      }));
    }

    const totalPages = Math.ceil(total / limit);

    const response: MitraResponse = {
      items: mitras,
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