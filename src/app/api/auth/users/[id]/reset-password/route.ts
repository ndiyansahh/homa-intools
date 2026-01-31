import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { resetUserPassword } from '@/lib/users';
import { logAuthEvent } from '@/lib/logger';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// POST: Reset user's password (Admin only)
export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { id } = await params;
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        if (session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
        }

        // Demo users cannot be modified
        if (id.startsWith('demo-')) {
            return NextResponse.json({ error: 'Cannot reset password for demo users' }, { status: 400 });
        }

        const body = await request.json();
        const { newPassword } = body;

        if (!newPassword || newPassword.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        const result = await resetUserPassword(id, newPassword);

        if (!result.success) {
            return NextResponse.json({ error: result.error }, { status: 400 });
        }

        logAuthEvent({
            action: 'password_reset_by_admin',
            userId: session.userId,
            email: session.email,
            details: {
                targetUserId: id,
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error resetting password:', error);
        return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 });
    }
}
