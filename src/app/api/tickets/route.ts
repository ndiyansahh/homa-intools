import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ticketDB } from '@/lib/schema';
import { eq, desc, and } from 'drizzle-orm';
import { getSession } from '@/lib/auth';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json(
        { success: false, message: 'Forbidden' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const statusFilter = searchParams.get('status') || '';
    const priorityFilter = searchParams.get('priority') || '';
    const categoryFilter = searchParams.get('category') || '';

    const conditions = [];

    if (statusFilter) {
      conditions.push(eq(ticketDB.status, statusFilter));
    }
    if (priorityFilter) {
      conditions.push(eq(ticketDB.priority, priorityFilter));
    }
    if (categoryFilter) {
      conditions.push(eq(ticketDB.category, categoryFilter));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const tickets = await db
      .select()
      .from(ticketDB)
      .where(whereClause)
      .orderBy(desc(ticketDB.createdAt));

    return NextResponse.json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    console.error('Tickets API error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
