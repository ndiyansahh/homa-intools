import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB, attendanceScheduleDB } from '@/lib/schema';
import { sql, and, or, ilike, eq, desc, count, not, inArray } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { CreateMitraRequest, MitraListItem, MitraResponse, MitraData, MitraGender, MitraPartnershipType, MitraStatus, MitraBonusCommission, MitraCityAssignment, MitraSubscriptionType } from '@/types/mitra';
import { logAuditEvent } from '@/lib/logger';
import { sanitizeSQLLike, sanitizeText } from '@/lib/input-sanitizer';

// Simple interface for available mitra response
interface AvailableMitra {
  id: string;
  name: string;
  phone: string;
  mitraName?: string; // Backward compatibility
  contact?: string; // Backward compatibility
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
      // Add mitraName for backward compatibility
      mitraName: mitra.name || 'Unknown',
      contact: mitra.phone || mitra.contact || '', // Add contact for backward compatibility
    }));

    // Return consistent format with metadata
    return NextResponse.json({
      success: true,
      data: availableMitra,
      count: availableMitra.length
    });

  } catch (dbError) {
    console.error('❌ CRITICAL: Database error in getAvailableMitra:', dbError);

    // NO FALLBACK TO MOCK DATA - Return empty array with error indicator
    return NextResponse.json([], {
      status: 500,
      statusText: 'Database error',
      headers: {
        'X-Error': 'Database connection failed'
      }
    });
  }
}

// ⚠️ DEPRECATED: Mock data is NO LONGER USED - All data comes from database
// This is kept only for reference and will be removed in future versions
// Mock data storage (replace with real database) - Updated to match new schema
let mitraData: any[] = [];

// Log warning if someone tries to use mock data
if (mitraData.length > 0) {
  console.warn('⚠️ WARNING: Mock data detected but should not be used. All mitra data must come from database.');
}

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
    console.error('❌ Database error in mitraCode generation:', error);

    // Fallback: Use timestamp-based sequence instead of mock data
    const timestamp = Date.now();
    const sequence = String(timestamp % 1000000).padStart(6, '0');
    const fallbackCode = `MITRA-${yearMonth}-${sequence}`;

    console.log(`🔄 Fallback mitraCode (using timestamp): ${fallbackCode}`);
    return fallbackCode;
  }
};

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

    // Validate partnership type if provided (optional, defaults to 'Full Time')
    if (body.mitraPartnership && !['Full Time', 'Part Time'].includes(body.mitraPartnership)) {
      return NextResponse.json({
        error: 'Partnership type must be "Full Time" or "Part Time"'
      }, { status: 400 });
    }

    // Validate bonus commission if provided (optional, defaults to 'Eligible')
    if (body.mitraBonusCommission && !['Eligible', 'Not Eligible'].includes(body.mitraBonusCommission)) {
      return NextResponse.json({
        error: 'Bonus commission must be "Eligible" or "Not Eligible"'
      }, { status: 400 });
    }

    // Validate subscription type if provided (optional, defaults to 'Regular')
    if (body.subscriptionType && !['Basic', 'Regular', 'Frequent'].includes(body.subscriptionType)) {
      return NextResponse.json({
        error: 'Subscription type must be "Basic", "Regular", or "Frequent"'
      }, { status: 400 });
    }

    // Validate payout rate is a positive number if provided (optional)
    const payoutRateValue = body.payoutRate ?? body.monthlyBaseRate;
    if (payoutRateValue !== undefined && (typeof payoutRateValue !== 'number' || payoutRateValue < 0)) {
      return NextResponse.json({
        error: 'Payout rate must be a non-negative number'
      }, { status: 400 });
    }

    // Validate bonus rate if provided (always optional now)
    if (body.bonusRate !== undefined && (typeof body.bonusRate !== 'number' || body.bonusRate < 0)) {
      return NextResponse.json({
        error: 'Bonus rate must be a non-negative number'
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
        mitraPartnership: body.mitraPartnership || 'Full Time', // Default to Full Time
        mitraTenure: body.mitraTenure || 0,
        mitraExitDate: body.mitraExitDate || null,
        mitraBonusCommission: body.mitraBonusCommission || 'Eligible', // Default to Eligible

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

        // Subscription and rate fields (NEW)
        subscriptionType: body.subscriptionType || 'Regular', // Default to Regular
        monthlyBaseRate: (payoutRateValue ?? 0).toString(),
        bonusRate: body.bonusRate ? body.bonusRate.toString() : '0', // Always accept bonus rate (not conditional)
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
      console.error('❌ CRITICAL: Database error during mitra creation:', dbError);

      // NO FALLBACK TO MOCK DATA - Return proper error
      return NextResponse.json({
        success: false,
        error: 'Database error: Failed to create mitra',
        details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
      }, { status: 500 });
    }

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

    // Build where conditions
    const conditions = [];

    // Search in name, mitra code, nik, or phone with new schema
    // SECURITY FIX: Sanitize search input to prevent SQL injection
    if (q) {
      const sanitizedQ = sanitizeSQLLike(q);
      if (sanitizedQ) {
        conditions.push(
          or(
            ilike(mitraDB.mitraName, `%${sanitizedQ}%`),
            ilike(mitraDB.mitraCode, `%${sanitizedQ}%`),
            ilike(mitraDB.mitraNIK, `%${sanitizedQ}%`),
            ilike(mitraDB.mitraPhone, `%${sanitizedQ}%`),
            ilike(mitraDB.contact, `%${sanitizedQ}%`), // Legacy fallback
            ilike(mitraDB.address, `%${sanitizedQ}%`)
          )
        );
      }
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
    // SECURITY FIX: Sanitize city filter
    if (city) {
      const sanitizedCity = sanitizeSQLLike(city);
      if (sanitizedCity) {
        conditions.push(
          or(
            ilike(mitraDB.mitraCityAssignment, `%${sanitizedCity}%`),
            ilike(mitraDB.city, `%${sanitizedCity}%`) // Legacy fallback
          )
        );
      }
    }

    // Add soft delete condition (only show non-deleted)
    conditions.push(or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count from DATABASE ONLY
    const countResult = await db
      .select({ count: count() })
      .from(mitraDB)
      .where(whereClause);

    const total = countResult[0]?.count || 0;

    // Get paginated mitras from DATABASE ONLY - NO MOCK DATA FALLBACK
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
        baseRate: mitraDB.baseRate,
        monthlyBaseRate: mitraDB.monthlyBaseRate,
        subscriptionType: mitraDB.subscriptionType,
        bonusRate: mitraDB.bonusRate,
        trialRatePerVisit: mitraDB.trialRatePerVisit,
      })
      .from(mitraDB)
      .where(whereClause)
      .orderBy(desc(mitraDB.createdAt))
      .limit(limit)
      .offset(offset);

    const mitras: MitraListItem[] = result.map(mitra => ({
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
      baseRate: mitra.baseRate || '0',
      monthlyBaseRate: mitra.monthlyBaseRate || '0',
      subscriptionType: (mitra.subscriptionType as MitraSubscriptionType) || 'Regular',
      payoutRate: mitra.monthlyBaseRate || '0',
      bonusRate: mitra.bonusRate || '0',
      bonusCommission: (mitra.mitraBonusCommission as MitraBonusCommission) || 'Eligible',
      trialRatePerVisit: mitra.trialRatePerVisit || null,
    }));

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