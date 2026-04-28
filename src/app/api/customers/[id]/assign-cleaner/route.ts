import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { customerDB, mitraDB } from '@/lib/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Get available cleaners from database
async function getAvailableCleaners(): Promise<string[]> {
  try {
    const mitras = await db
      .select({
        mitraName: mitraDB.mitraName,
      })
      .from(mitraDB)
      .where(
        and(
          eq(mitraDB.status, 'Active'),
          or(eq(mitraDB.isDeleted, false), sql`${mitraDB.isDeleted} IS NULL`)
        )
      );
    
    return mitras.map(m => m.mitraName);
  } catch (error) {
    console.error('Error fetching mitras:', error);
    // Fallback to hardcoded list if database fails
    return [
      'Ardi', 'Inem', 'Siti', 'Budi', 'Ani', 'Dewi', 
      'Rina', 'Tono', 'Wati', 'Didi', 'Maya', 'Joko'
    ];
  }
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can assign
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { id: customerId } = await params;
    const body = await request.json();
    const { cleaner1, cleaner2 } = body;

    // Get available cleaners from database
    const availableCleaners = await getAvailableCleaners();

    // Validate cleaners
    if (cleaner1 && !availableCleaners.includes(cleaner1)) {
      return NextResponse.json(
        { success: false, error: 'Invalid cleaner 1 selected' },
        { status: 400 }
      );
    }

    if (cleaner2 && !availableCleaners.includes(cleaner2)) {
      return NextResponse.json(
        { success: false, error: 'Invalid cleaner 2 selected' },
        { status: 400 }
      );
    }

    if (cleaner1 && cleaner2 && cleaner1 === cleaner2) {
      return NextResponse.json(
        { success: false, error: 'Cannot assign the same cleaner twice' },
        { status: 400 }
      );
    }

    try {
      // Check if customer exists
      const existingCustomer = await db
        .select()
        .from(customerDB)
        .where(
          and(
            eq(customerDB.id, customerId),
            or(eq(customerDB.isDeleted, false), sql`${customerDB.isDeleted} IS NULL`)
          )
        )
        .limit(1);

      if (existingCustomer.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Customer not found' },
          { status: 404 }
        );
      }

      // Find mitra IDs for the cleaner names (if we have mitras in database)
      let primaryMitraId = null;
      let backupMitraId = null;

      if (cleaner1) {
        const primaryMitra = await db
          .select({ id: mitraDB.id })
          .from(mitraDB)
          .where(eq(mitraDB.mitraName, cleaner1))
          .limit(1);

        if (primaryMitra.length > 0) {
          primaryMitraId = primaryMitra[0].id;
        }
      }

      if (cleaner2) {
        const backupMitra = await db
          .select({ id: mitraDB.id })
          .from(mitraDB)
          .where(eq(mitraDB.mitraName, cleaner2))
          .limit(1);

        if (backupMitra.length > 0) {
          backupMitraId = backupMitra[0].id;
        }
      }

      // Update customer with assigned cleaner information
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Update mitra IDs if found in database
      if (primaryMitraId) updateData.assignedMitraId = primaryMitraId;
      if (backupMitraId) {
        // Get existing backup mitra IDs and append if not already present
        const existing = await db
          .select({ backupMitraIds: customerDB.backupMitraIds })
          .from(customerDB)
          .where(eq(customerDB.id, customerId))
          .limit(1);
        const existingIds = existing[0]?.backupMitraIds ?? [];
        updateData.backupMitraIds = existingIds.includes(backupMitraId)
          ? existingIds
          : [...existingIds, backupMitraId];
      }

      await db
        .update(customerDB)
        .set(updateData)
        .where(eq(customerDB.id, customerId));

      // Log audit event
      if (session) {
        logAuditEvent({ 
          action: 'CLEANER_ASSIGNED',
          userId: session.userId,
          email: session.email,
          details: {
            customerId, 
            cleaner1, 
            cleaner2,
            primaryMitraId,
            backupMitraId: backupMitraId || null
          }
        });
      }

      return NextResponse.json({
        success: true,
        message: 'Cleaners assigned successfully',
      });

    } catch (dbError) {
      console.error('Database error during cleaner assignment:', dbError);
      return NextResponse.json(
        { success: false, error: 'Failed to assign cleaners - database error' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Assign cleaner API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to assign cleaners' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check RBAC - ADMIN/OWNER/STAFF can view
    if (session && !['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    // Get available cleaners from database
    const availableCleaners = await getAvailableCleaners();

    return NextResponse.json({
      success: true,
      availableCleaners,
    });

  } catch (error) {
    console.error('Get available cleaners API error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to get available cleaners' },
      { status: 500 }
    );
  }
}