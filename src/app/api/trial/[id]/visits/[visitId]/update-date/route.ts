import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { visitDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { getSession } from '@/lib/auth';
import { logDetailedAudit } from '@/lib/audit-logger.server';
import { visitActionHistoryDB } from '@/lib/schema';

interface RouteParams {
  params: Promise<{ id: string; visitId: string }>;
}

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
): Promise<NextResponse> {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    if (!['ADMIN', 'OWNER', 'STAFF'].includes(session.role)) {
      return NextResponse.json({ success: false, message: 'Forbidden' }, { status: 403 });
    }

    const { visitId } = await params;
    const body = await request.json();
    const { newDate } = body;

    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
      return NextResponse.json(
        { success: false, message: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const existing = await db
      .select({ id: visitDB.id, scheduledDate: visitDB.scheduledDate })
      .from(visitDB)
      .where(eq(visitDB.id, visitId))
      .limit(1);

    if (existing.length === 0) {
      return NextResponse.json({ success: false, message: 'Visit not found' }, { status: 404 });
    }

    const oldDate = existing[0].scheduledDate;

    await db
      .update(visitDB)
      .set({
        scheduledDate: newDate,
        scheduledDay: new Date(newDate + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'long' }),
        updatedBy: session.email,
        updatedAt: new Date(),
      })
      .where(eq(visitDB.id, visitId));

    await db.insert(visitActionHistoryDB).values({
      visitId,
      actionType: 'EDIT_DATE',
      oldValue: { scheduledDate: oldDate },
      newValue: { scheduledDate: newDate },
      changedBy: session.email,
    });

    return NextResponse.json({ success: true, message: 'Visit date updated successfully' });

  } catch (error) {
    console.error('Error updating visit date:', error);
    return NextResponse.json({ success: false, message: 'Failed to update visit date' }, { status: 500 });
  }
}
