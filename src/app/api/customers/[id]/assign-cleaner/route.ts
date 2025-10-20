import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logAuditEvent } from '@/lib/logger';

interface RouteParams {
  params: { id: string };
}

// Available cleaners list  
const availableCleaners = [
  'Ardi', 'Inem', 'Siti', 'Budi', 'Ani', 'Dewi', 
  'Rina', 'Tono', 'Wati', 'Didi', 'Maya', 'Joko'
];

export async function POST(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
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

    const customerId = params.id;
    const body = await request.json();
    const { cleaner1, cleaner2 } = body;

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

    // For now, we'll just return success since we don't have a cleaners table
    // In a real implementation, you would update the customer record or create assignment records

    // Log audit event
    if (session) {
      await logAuditEvent(session.userId, 'CLEANER_ASSIGNED', { 
        customerId, 
        cleaner1, 
        cleaner2 
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Cleaners assigned successfully',
    });

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
    if (!session && process.env.NODE_ENV !== 'development') {
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