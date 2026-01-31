import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resetUserPassword } from '@/lib/users';
import { logAuthEvent } from '@/lib/logger';
import { db } from '@/lib/db';
import { userDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// DELETE: Delete a user (Admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        // Prevent deleting self
        if (id === session.userId) {
            return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
        }

        // Demo users cannot be deleted
        if (id.startsWith('demo-')) {
            return NextResponse.json({ error: 'Cannot delete demo users' }, { status: 400 });
        }

        try {
            await db.delete(userDB).where(eq(userDB.id, id));

            logAuthEvent({
                action: 'user_deleted',
                userId: session.userId,
                email: session.email,
                details: {
                    deletedUserId: id,
                },
            });

            return NextResponse.json({ success: true });
        } catch (dbError) {
            console.error('Database error deleting user:', dbError);
            return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
    }
}
