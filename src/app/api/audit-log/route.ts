import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';
import { auditLogDB } from '@/lib/schema';
import { eq, desc, and, or, like } from 'drizzle-orm';

// GET - Fetch audit logs with filters
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check RBAC - ADMIN/OWNER can view audit logs
    if (session && !['ADMIN', 'OWNER'].includes(session.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');
    const userEmail = searchParams.get('userEmail');
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));

    // Build where conditions
    const conditions = [];

    if (entityType) {
      conditions.push(eq(auditLogDB.entityType, entityType as any));
    }

    if (entityId) {
      conditions.push(eq(auditLogDB.entityId, entityId));
    }

    if (action) {
      conditions.push(like(auditLogDB.action, `%${action}%`));
    }

    if (userEmail) {
      conditions.push(like(auditLogDB.userEmail, `%${userEmail}%`));
    }

    // Fetch audit logs
    const logs = await db
      .select()
      .from(auditLogDB)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(auditLogDB.createdAt))
      .limit(limit);

    return NextResponse.json({
      success: true,
      data: logs,
      total: logs.length,
    });

  } catch (error) {
    console.error('Get audit logs error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
