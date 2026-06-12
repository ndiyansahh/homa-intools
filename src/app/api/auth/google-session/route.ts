import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import { db } from '@/lib/db';
import { userDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { createSession } from '@/lib/auth';
import { setCSRFToken } from '@/lib/csrf';
import { logAuthEvent } from '@/lib/logger';
import { UserRole } from '@/types/auth';

export const GET = auth(async function GET(request) {
  try {
    const googleSession = request.auth;

    if (!googleSession?.user?.email) {
      return NextResponse.redirect(new URL('/login?error=google_failed', request.url));
    }

    const email = googleSession.user.email;

    const users = await db
      .select()
      .from(userDB)
      .where(eq(userDB.email, email))
      .limit(1);

    if (users.length === 0 || !users[0].isActive) {
      return NextResponse.redirect(new URL('/login?error=not_authorized', request.url));
    }

    const dbUser = users[0];

    await createSession(
      dbUser.id,
      dbUser.role as UserRole,
      dbUser.email,
      dbUser.mustChangePassword,
    );

    await setCSRFToken();

    await db
      .update(userDB)
      .set({ failedLoginAttempts: 0, lockedUntil: null, updatedAt: new Date() })
      .where(eq(userDB.id, dbUser.id));

    logAuthEvent({
      action: 'login_success',
      userId: dbUser.id,
      email: dbUser.email,
      details: { success: true, method: 'google', mustChangePassword: dbUser.mustChangePassword },
    });

    if (dbUser.mustChangePassword) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }

    return NextResponse.redirect(new URL('/app/dashboard', request.url));

  } catch (error) {
    console.error('Google session error:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}) as any;
