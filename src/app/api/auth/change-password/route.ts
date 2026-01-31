import { NextRequest, NextResponse } from 'next/server';
import { getSession, createSession } from '@/lib/auth';
import { changeUserPassword } from '@/lib/users';
import { logAuthEvent } from '@/lib/logger';
import { ChangePasswordRequest, ChangePasswordResponse } from '@/types/auth';

export async function POST(request: NextRequest) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json(
                { success: false, message: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body: ChangePasswordRequest = await request.json();
        const { currentPassword, newPassword } = body;

        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { success: false, message: 'Current password and new password are required' },
                { status: 400 }
            );
        }

        // Change password in database
        const result = await changeUserPassword(session.userId, currentPassword, newPassword);

        if (!result.success) {
            logAuthEvent({
                action: 'change_password_failed',
                userId: session.userId,
                email: session.email,
                details: {
                    success: false,
                    error: result.error,
                },
            });

            return NextResponse.json(
                { success: false, message: result.error } as ChangePasswordResponse,
                { status: 400 }
            );
        }

        // Update session to reflect mustChangePassword = false
        await createSession(session.userId, session.role, session.email, false);

        logAuthEvent({
            action: 'change_password_success',
            userId: session.userId,
            email: session.email,
            details: {
                success: true,
            },
        });

        return NextResponse.json(
            { success: true, message: 'Password changed successfully' } as ChangePasswordResponse,
            { status: 200 }
        );

    } catch (error) {
        console.error('Change password API error:', error);
        return NextResponse.json(
            { success: false, message: 'Failed to change password' },
            { status: 500 }
        );
    }
}
