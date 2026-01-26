import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { mitraRateConfigDB, mitraDB, subscriptionPackageDB } from '@/lib/schema';
import { eq, and, isNull, desc } from 'drizzle-orm';
import { logAuditEvent } from '@/lib/logger';

// GET - Fetch all rate configurations for a specific mitra
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

    const { id: mitraId } = await params;

    console.log(`📊 Fetching rate configs for mitra ${mitraId}`);

    // Fetch all rate configurations for this mitra (including historical)
    const rateConfigs = await db
      .select({
        id: mitraRateConfigDB.id,
        mitraId: mitraRateConfigDB.mitraId,
        subscriptionPackageId: mitraRateConfigDB.subscriptionPackageId,
        subscriptionPackageName: subscriptionPackageDB.subscriptionPackage,
        monthlyRate: mitraRateConfigDB.monthlyRate,
        effectiveFrom: mitraRateConfigDB.effectiveFrom,
        effectiveTo: mitraRateConfigDB.effectiveTo,
        notes: mitraRateConfigDB.notes,
        isActive: mitraRateConfigDB.isActive,
        createdAt: mitraRateConfigDB.createdAt,
        updatedAt: mitraRateConfigDB.updatedAt,
        createdBy: mitraRateConfigDB.createdBy,
      })
      .from(mitraRateConfigDB)
      .leftJoin(
        subscriptionPackageDB,
        eq(mitraRateConfigDB.subscriptionPackageId, subscriptionPackageDB.id)
      )
      .where(eq(mitraRateConfigDB.mitraId, mitraId))
      .orderBy(desc(mitraRateConfigDB.effectiveFrom), desc(mitraRateConfigDB.createdAt));

    console.log(`✅ Found ${rateConfigs.length} rate configurations`);

    return NextResponse.json({
      success: true,
      data: rateConfigs,
    });

  } catch (error) {
    console.error('Get mitra rate configs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new rate configuration for a mitra
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can create rate configs
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: mitraId } = await params;
    const body = await request.json();
    const {
      subscriptionPackageId = null, // NULL = default rate for all packages
      monthlyRate,
      effectiveFrom,
      effectiveTo = null, // NULL = currently active
      notes = '',
    } = body;

    // Validation
    if (!monthlyRate || monthlyRate <= 0) {
      return NextResponse.json({
        error: 'Monthly rate is required and must be greater than 0'
      }, { status: 400 });
    }

    if (!effectiveFrom) {
      return NextResponse.json({
        error: 'Effective from date is required'
      }, { status: 400 });
    }

    // Verify mitra exists
    const mitra = await db
      .select({ id: mitraDB.id, mitraName: mitraDB.mitraName })
      .from(mitraDB)
      .where(eq(mitraDB.id, mitraId))
      .limit(1);

    if (mitra.length === 0) {
      return NextResponse.json({ error: 'Mitra not found' }, { status: 404 });
    }

    // Verify subscription package exists (if provided)
    if (subscriptionPackageId) {
      const pkg = await db
        .select({ id: subscriptionPackageDB.id })
        .from(subscriptionPackageDB)
        .where(eq(subscriptionPackageDB.id, subscriptionPackageId))
        .limit(1);

      if (pkg.length === 0) {
        return NextResponse.json({
          error: 'Subscription package not found'
        }, { status: 404 });
      }
    }

    console.log(`📝 Creating rate config for ${mitra[0].mitraName}`);

    // Check for overlapping active rate configs
    const overlapping = await db
      .select({ id: mitraRateConfigDB.id })
      .from(mitraRateConfigDB)
      .where(
        and(
          eq(mitraRateConfigDB.mitraId, mitraId),
          subscriptionPackageId
            ? eq(mitraRateConfigDB.subscriptionPackageId, subscriptionPackageId)
            : isNull(mitraRateConfigDB.subscriptionPackageId),
          eq(mitraRateConfigDB.isActive, true),
          isNull(mitraRateConfigDB.effectiveTo)
        )
      )
      .limit(1);

    if (overlapping.length > 0) {
      return NextResponse.json({
        error: 'An active rate configuration already exists for this mitra/package combination. Please deactivate it first or set an effectiveTo date.'
      }, { status: 400 });
    }

    // Insert new rate config
    const newRateConfig = await db
      .insert(mitraRateConfigDB)
      .values({
        mitraId,
        subscriptionPackageId,
        monthlyRate: monthlyRate.toString(),
        effectiveFrom,
        effectiveTo,
        notes,
        createdBy: session?.email || 'system',
        isActive: true,
      })
      .returning();

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'MITRA_RATE_CONFIG_CREATED',
        userId: session.userId,
        email: session.email,
        details: {
          mitraId,
          rateConfigId: newRateConfig[0].id,
          monthlyRate,
          subscriptionPackageId,
        }
      });
    }

    console.log(`✅ Rate config created successfully`);

    return NextResponse.json({
      success: true,
      message: 'Rate configuration created successfully',
      data: newRateConfig[0],
    }, { status: 201 });

  } catch (error) {
    console.error('Create mitra rate config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH - Update existing rate configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can update rate configs
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: mitraId } = await params;
    const body = await request.json();
    const { rateConfigId, ...updates } = body;

    if (!rateConfigId) {
      return NextResponse.json({
        error: 'Rate config ID is required'
      }, { status: 400 });
    }

    console.log(`📝 Updating rate config ${rateConfigId}`);

    // Verify rate config exists and belongs to this mitra
    const existing = await db
      .select()
      .from(mitraRateConfigDB)
      .where(
        and(
          eq(mitraRateConfigDB.id, rateConfigId),
          eq(mitraRateConfigDB.mitraId, mitraId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Rate configuration not found'
      }, { status: 404 });
    }

    // Build update object
    const updateData: any = { updatedAt: new Date() };

    if (updates.monthlyRate !== undefined) {
      if (updates.monthlyRate <= 0) {
        return NextResponse.json({
          error: 'Monthly rate must be greater than 0'
        }, { status: 400 });
      }
      updateData.monthlyRate = updates.monthlyRate.toString();
    }

    if (updates.effectiveFrom !== undefined) {
      updateData.effectiveFrom = updates.effectiveFrom;
    }

    if (updates.effectiveTo !== undefined) {
      updateData.effectiveTo = updates.effectiveTo;
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    if (updates.isActive !== undefined) {
      updateData.isActive = updates.isActive;
    }

    // Update rate config
    const updated = await db
      .update(mitraRateConfigDB)
      .set(updateData)
      .where(eq(mitraRateConfigDB.id, rateConfigId))
      .returning();

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'MITRA_RATE_CONFIG_UPDATED',
        userId: session.userId,
        email: session.email,
        details: {
          mitraId,
          rateConfigId,
          updates,
        }
      });
    }

    console.log(`✅ Rate config updated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Rate configuration updated successfully',
      data: updated[0],
    });

  } catch (error) {
    console.error('Update mitra rate config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Soft delete (deactivate) a rate configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can delete rate configs
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id: mitraId } = await params;
    const { searchParams } = new URL(request.url);
    const rateConfigId = searchParams.get('rateConfigId');

    if (!rateConfigId) {
      return NextResponse.json({
        error: 'Rate config ID is required'
      }, { status: 400 });
    }

    console.log(`🗑️  Deactivating rate config ${rateConfigId}`);

    // Verify rate config exists and belongs to this mitra
    const existing = await db
      .select()
      .from(mitraRateConfigDB)
      .where(
        and(
          eq(mitraRateConfigDB.id, rateConfigId),
          eq(mitraRateConfigDB.mitraId, mitraId)
        )
      )
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({
        error: 'Rate configuration not found'
      }, { status: 404 });
    }

    // Soft delete (deactivate)
    const updated = await db
      .update(mitraRateConfigDB)
      .set({
        isActive: false,
        effectiveTo: new Date().toISOString().split('T')[0], // Set end date to today
        updatedAt: new Date(),
      })
      .where(eq(mitraRateConfigDB.id, rateConfigId))
      .returning();

    // Log audit event
    if (session) {
      await logAuditEvent({
        action: 'MITRA_RATE_CONFIG_DELETED',
        userId: session.userId,
        email: session.email,
        details: {
          mitraId,
          rateConfigId,
        }
      });
    }

    console.log(`✅ Rate config deactivated successfully`);

    return NextResponse.json({
      success: true,
      message: 'Rate configuration deactivated successfully',
      data: updated[0],
    });

  } catch (error) {
    console.error('Delete mitra rate config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
