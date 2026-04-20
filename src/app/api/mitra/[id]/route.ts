import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { mitraDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { UpdateMitraRequest, MitraData } from '@/types/mitra';
import { logDetailedAudit, getChangedFields } from '@/lib/audit-logger.server';

// ⚠️ DEPRECATED: Mock data is NO LONGER USED - All data comes from database
// This is kept only for reference and will be removed in future versions

// GET /api/mitra/[id] - Get individual mitra details
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
          // Legacy fields
          contact: mitraDB.contact,
          address: mitraDB.address,
          city: mitraDB.city,
          district: mitraDB.district,
          status: mitraDB.status,
          joinDate: mitraDB.joinDate,
          createdAt: mitraDB.createdAt,
          updatedAt: mitraDB.updatedAt,
          // New fields
          subscriptionType: mitraDB.subscriptionType,
          monthlyBaseRate: mitraDB.monthlyBaseRate,
          mitraBonusCommission: mitraDB.mitraBonusCommission,
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

        // Calculate tenure in months from joinDate to today (Asia/Jakarta)
        const calculateTenure = (joinDateStr: string | null | undefined): number => {
          const raw = joinDateStr || dbMitra.createdAt?.toISOString();
          if (!raw) return 0;
          const join = new Date(raw);
          const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
          return Math.max(0, (now.getFullYear() - join.getFullYear()) * 12 + (now.getMonth() - join.getMonth()));
        };

        const calculatedTenure = calculateTenure(dbMitra.joinDate);

        // Persist updated tenure to DB if it differs
        if (calculatedTenure !== (dbMitra.mitraTenure ?? 0)) {
          await db.update(mitraDB).set({ mitraTenure: calculatedTenure, updatedAt: new Date() }).where(eq(mitraDB.id, id));
        }

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
          tenure: calculatedTenure.toString(),
          exitDate: dbMitra.mitraExitDate || undefined,
          bonus: dbMitra.mitraBonusCommission || 'Eligible',
          createdAt: dbMitra.createdAt?.toISOString() || new Date().toISOString(),
          updatedAt: dbMitra.updatedAt?.toISOString() || new Date().toISOString(),
          isDeleted: false,
          // Subscription and rate fields
          subscriptionType: (dbMitra.subscriptionType as any) || 'Regular',
          payoutRate: dbMitra.monthlyBaseRate || '0',
        };

        console.log(`✅ Found mitra in database: ${mitraData.name} (${mitraData.mitraCode})`);
        return NextResponse.json(mitraData);
      }
    } catch (dbError) {
      console.error('❌ CRITICAL: Database error while fetching mitra details:', dbError);
      return NextResponse.json({
        error: 'Database error: Failed to fetch mitra details',
        details: process.env.NODE_ENV === 'development' ? String(dbError) : undefined
      }, { status: 500 });
    }

    // If we reach here, mitra was not found in database
    return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
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
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER/STAFF can update
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body: Partial<UpdateMitraRequest> = await request.json();

    // Check if mitra exists in database - fetch full record for audit logging
    const existingMitra = await db
      .select()
      .from(mitraDB)
      .where(
        and(
          eq(mitraDB.id, id),
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    if (existingMitra.length === 0) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    const oldMitraData = existingMitra[0];

    // Check NIK uniqueness if NIK is being updated
    if (body.mitraNIK && body.mitraNIK !== existingMitra[0].mitraNIK) {
      const nikCheck = await db
        .select({ id: mitraDB.id })
        .from(mitraDB)
        .where(
          and(
            eq(mitraDB.mitraNIK, body.mitraNIK),
            or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (nikCheck.length > 0 && nikCheck[0].id !== id) {
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

    // Build update object (only include provided fields)
    const updateData: any = {
      updatedAt: new Date()
    };

    if ((body as any).joinDate) {
      const jd = (body as any).joinDate;
      const match = jd.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      updateData.joinDate = match ? `${match[3]}-${match[2]}-${match[1]}` : jd;
    }
    if (body.mitraName) updateData.mitraName = body.mitraName;
    if (body.mitraNIK) updateData.mitraNIK = body.mitraNIK;
    if (body.mitraGender) updateData.mitraGender = body.mitraGender;
    if (body.mitraDOB) updateData.mitraDOB = body.mitraDOB;
    if (body.mitraPhone) updateData.mitraPhone = body.mitraPhone;
    if (body.mitraBankAccount) updateData.mitraBankAccount = body.mitraBankAccount;
    if (body.mitraBankHolderName) updateData.mitraBankHolderName = body.mitraBankHolderName;
    if (body.mitraBankAccountNumber) updateData.mitraBankAccountNumber = body.mitraBankAccountNumber;
    if (body.mitraCityAssignment) updateData.mitraCityAssignment = body.mitraCityAssignment;
    if (body.mitraLocationAssignment) {
      updateData.mitraLocationAssignment = Array.isArray(body.mitraLocationAssignment)
        ? JSON.stringify(body.mitraLocationAssignment)
        : body.mitraLocationAssignment;
    }
    if (body.mitraPartnership) updateData.mitraPartnership = body.mitraPartnership;
    // mitraTenure is auto-calculated from joinDate on GET, skip manual override
    if (body.mitraExitDate) updateData.mitraExitDate = body.mitraExitDate;
    if (body.status) updateData.status = body.status;
    if (body.address) updateData.address = body.address;

    // Handle payout rate (payoutRate or monthlyBaseRate)
    if (body.payoutRate !== undefined) {
      updateData.monthlyBaseRate = typeof body.payoutRate === 'number' ? body.payoutRate.toString() : body.payoutRate;
    } else if (body.monthlyBaseRate !== undefined) {
      updateData.monthlyBaseRate = typeof body.monthlyBaseRate === 'number' ? body.monthlyBaseRate.toString() : body.monthlyBaseRate;
    }

    // Handle bonus commission eligibility
    if ((body as any).mitraBonusCommission) {
      const val = (body as any).mitraBonusCommission;
      if (!['Eligible', 'Not Eligible'].includes(val)) {
        return NextResponse.json({ error: 'mitraBonusCommission must be "Eligible" or "Not Eligible"' }, { status: 400 });
      }
      updateData.mitraBonusCommission = val;
    }

    // Handle subscription type
    if (body.subscriptionType) {
      if (!['Basic', 'Regular', 'Frequent'].includes(body.subscriptionType)) {
        return NextResponse.json({
          error: 'Subscription type must be "Basic", "Regular", or "Frequent"'
        }, { status: 400 });
      }
      updateData.subscriptionType = body.subscriptionType;
    }

    // Handle trial rate per visit
    if (body.trialRatePerVisit !== undefined) {
      updateData.trialRatePerVisit = body.trialRatePerVisit !== null
        ? (typeof body.trialRatePerVisit === 'number' ? body.trialRatePerVisit.toString() : body.trialRatePerVisit)
        : null;
    }

    // Update the mitra in database
    await db
      .update(mitraDB)
      .set(updateData)
      .where(eq(mitraDB.id, id));

    // Create new data object for audit comparison
    const newMitraData = { ...oldMitraData, ...updateData };

    // Log detailed audit event with changed fields only
    if (session) {
      const changes = getChangedFields(oldMitraData, newMitraData);

      await logDetailedAudit({
        userId: session.userId,
        userEmail: session.email,
        action: 'UPDATE_MITRA',
        entityType: 'mitra',
        entityId: id,
        oldValue: changes.old,
        newValue: changes.new,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    }

    return NextResponse.json({
      id: existingMitra[0].id,
      message: 'Mitra updated successfully'
    });
  } catch (error) {
    console.error('Update mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH /api/mitra/[id] - Partial update mitra (alias for PUT)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return PUT(request, { params });
}

// DELETE /api/mitra/[id] - Soft delete mitra
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
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    // Check if mitra exists in database
    const existingMitra = await db
      .select({
        id: mitraDB.id,
        mitraCode: mitraDB.mitraCode,
        mitraName: mitraDB.mitraName,
        mitraNIK: mitraDB.mitraNIK,
        status: mitraDB.status
      })
      .from(mitraDB)
      .where(
        and(
          eq(mitraDB.id, id),
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      )
      .limit(1);

    if (existingMitra.length === 0) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    // Soft delete in database
    await db
      .update(mitraDB)
      .set({
        isDeleted: true,
        updatedAt: new Date()
      })
      .where(eq(mitraDB.id, id));

    // Log detailed audit event for deletion
    if (session) {
      await logDetailedAudit({
        userId: session.userId,
        userEmail: session.email,
        action: 'DELETE_MITRA',
        entityType: 'mitra',
        entityId: id,
        oldValue: {
          mitraCode: existingMitra[0].mitraCode,
          mitraName: existingMitra[0].mitraName,
          mitraNIK: existingMitra[0].mitraNIK,
          status: existingMitra[0].status,
          isDeleted: false,
        },
        newValue: {
          isDeleted: true,
        },
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });
    }

    return NextResponse.json({ message: 'Mitra deleted successfully' });
  } catch (error) {
    console.error('Delete mitra error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}