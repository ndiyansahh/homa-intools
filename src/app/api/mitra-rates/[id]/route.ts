import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { mitraRateConfigDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';

// PATCH - Update existing mitra rate configuration
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - Only ADMIN/OWNER can update
    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { payoutRate, visitsPerWeek } = body;

    // Validation
    if (payoutRate === undefined && visitsPerWeek === undefined) {
      return NextResponse.json(
        { error: 'At least one field must be provided' },
        { status: 400 }
      );
    }

    console.log('✏️ Updating mitra rate config:', { id, payoutRate, visitsPerWeek });

    // Check if rate exists
    const existing = await db
      .select()
      .from(mitraRateConfigDB)
      .where(eq(mitraRateConfigDB.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Rate configuration not found' },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (payoutRate !== undefined) {
      updateData.payoutRate = payoutRate.toString();
    }

    if (visitsPerWeek !== undefined) {
      if (visitsPerWeek < 1 || visitsPerWeek > 7) {
        return NextResponse.json(
          { error: 'visitsPerWeek must be between 1 and 7' },
          { status: 400 }
        );
      }
      updateData.visitsPerWeek = visitsPerWeek;
    }

    // Update rate config
    const updatedRateConfig = await db
      .update(mitraRateConfigDB)
      .set(updateData)
      .where(eq(mitraRateConfigDB.id, id))
      .returning();

    console.log('✅ Mitra rate config updated:', id);

    return NextResponse.json({
      success: true,
      data: updatedRateConfig[0],
      message: 'Rate configuration updated successfully'
    });

  } catch (error) {
    console.error('Update mitra rate config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete mitra rate configuration
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - Only ADMIN/OWNER can delete
    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;

    console.log('🗑️ Deleting mitra rate config:', id);

    // Check if rate exists
    const existing = await db
      .select()
      .from(mitraRateConfigDB)
      .where(eq(mitraRateConfigDB.id, id))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Rate configuration not found' },
        { status: 404 }
      );
    }

    // Delete rate config
    await db
      .delete(mitraRateConfigDB)
      .where(eq(mitraRateConfigDB.id, id));

    console.log('✅ Mitra rate config deleted:', id);

    return NextResponse.json({
      success: true,
      message: 'Rate configuration deleted successfully'
    });

  } catch (error) {
    console.error('Delete mitra rate config error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
