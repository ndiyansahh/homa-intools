import { NextRequest, NextResponse } from 'next/server';
import { validateUser, ValidateUserResult } from '@/lib/users';
import { createSession } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rate-limit';
import { logAuthEvent } from '@/lib/logger';
import { LoginRequest, LoginResponse, LoginError } from '@/types/auth';

export async function POST(request: NextRequest) {
  try {
    const body: LoginRequest = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' } as LoginError,
        { status: 401 }
      );
    }

    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const rateLimit = checkRateLimit(clientIp);
    if (!rateLimit.success) {
      logAuthEvent({
        action: 'login_rate_limited',
        email,
        details: {
          ip: clientIp,
          userAgent,
          success: false,
          error: 'Rate limit exceeded',
        },
      });

      return NextResponse.json(
        { error: 'RATE_LIMITED' } as LoginError,
        { status: 429 }
      );
    }

    // Validate user with database (ADR 0002)
    const result: ValidateUserResult = await validateUser(email, password);

    // Handle account lockout (ADR 0002)
    if (result.error === 'ACCOUNT_LOCKED') {
      logAuthEvent({
        action: 'login_account_locked',
        email,
        details: {
          ip: clientIp,
          userAgent,
          success: false,
          error: 'Account locked',
          lockedUntil: result.lockedUntil?.toISOString(),
        },
      });

      return NextResponse.json(
        {
          error: 'ACCOUNT_LOCKED',
          lockedUntil: result.lockedUntil?.toISOString()
        } as LoginError,
        { status: 423 }
      );
    }

    if (!result.user) {
      logAuthEvent({
        action: 'login_failed',
        email,
        details: {
          ip: clientIp,
          userAgent,
          success: false,
          error: 'Invalid credentials',
        },
      });

      return NextResponse.json(
        { error: 'INVALID_CREDENTIALS' } as LoginError,
        { status: 401 }
      );
    }

    // Create session with mustChangePassword flag (ADR 0002)
    await createSession(
      result.user.id,
      result.user.role,
      result.user.email,
      result.user.mustChangePassword
    );

    logAuthEvent({
      action: 'login_success',
      userId: result.user.id,
      email: result.user.email,
      details: {
        ip: clientIp,
        userAgent,
        success: true,
        mustChangePassword: result.user.mustChangePassword,
      },
    });

    const response: LoginResponse = {
      userId: result.user.id,
      role: result.user.role,
      mustChangePassword: result.user.mustChangePassword,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('Login API error:', error);

    logAuthEvent({
      action: 'login_error',
      details: {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });

    return NextResponse.json(
      { error: 'SERVER_ERROR' } as LoginError,
      { status: 500 }
    );
  }
}