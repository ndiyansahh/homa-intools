import { NextRequest, NextResponse } from 'next/server';
import { destroySession, getSession } from '@/lib/auth';
import { logAuthEvent } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    if (session) {
      logAuthEvent({
        level: 'info',
        action: 'logout_success',
        userId: session.userId,
        email: session.email,
        ip: clientIp,
        userAgent,
        success: true,
      });
    }

    await destroySession();

    return new NextResponse(null, { status: 204 });

  } catch (error) {
    console.error('Logout API error:', error);
    
    logAuthEvent({
      level: 'error',
      action: 'logout_error',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return new NextResponse(null, { status: 204 });
  }
}