import { NextRequest, NextResponse } from 'next/server';
import { validateUser } from '@/lib/users';
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

    const user = await validateUser(email, password);
    
    if (!user) {
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

    await createSession(user.id, user.role, user.email);

    logAuthEvent({
      action: 'login_success',
      userId: user.id,
      email: user.email,
      details: {
        ip: clientIp,
        userAgent,
        success: true,
      },
    });

    const response: LoginResponse = {
      userId: user.id,
      role: user.role,
    };

    // Return response with explicit headers to ensure cookie is set
    const jsonResponse = NextResponse.json(response, { status: 200 });
    return jsonResponse;

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