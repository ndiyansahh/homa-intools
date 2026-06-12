import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecret } from './src/lib/env-validation';
import { requiresCSRFProtection, validateCSRFToken } from './src/lib/csrf';
import { checkRateLimit } from './src/lib/rate-limit';

// SECURITY: JWT_SECRET validation enforced at startup
// No fallback - application will not start if JWT_SECRET is missing or weak
const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

const protectedRoutes = ['/app'];
const authRoutes = ['/login'];
const changePasswordRoute = '/change-password';

// ADR 0002: RBAC - Admin-only routes
const adminOnlyRoutes = ['/app/settings', '/app/users'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // SECURITY: Rate limiting for API requests (before CSRF to prevent DOS)
  const isApiRoute = pathname.startsWith('/api/');
  const isMutatingRequest = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method || '');

  if (isApiRoute && isMutatingRequest && !pathname.startsWith('/api/auth/')) {
    // Rate limit by IP address
    const clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const rateLimit = checkRateLimit(clientIp, 'api');

    if (!rateLimit.success) {
      console.warn('⚠️ Rate limit exceeded:', {
        path: pathname,
        ip: clientIp,
        resetTime: new Date(rateLimit.resetTime).toISOString(),
      });

      const response = NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );

      // Add rate limit headers
      response.headers.set('X-RateLimit-Limit', '100');
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', rateLimit.resetTime.toString());
      response.headers.set('Retry-After', Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString());

      return response;
    }
  }

  // SECURITY: CSRF Protection for mutating API requests
  if (requiresCSRFProtection(request)) {
    const isValid = await validateCSRFToken(request);
    if (!isValid) {
      console.warn('CSRF validation failed:', {
        path: pathname,
        method: request.method,
        ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      });
      return NextResponse.json(
        { error: 'Invalid CSRF token. Please refresh the page and try again.' },
        { status: 403 }
      );
    }
  }

  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route));
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route));
  const isChangePasswordRoute = pathname.startsWith(changePasswordRoute);
  const isAdminOnlyRoute = adminOnlyRoutes.some(route => pathname.startsWith(route));

  const sessionCookie = request.cookies.get('session');

  let isAuthenticated = false;
  let session: { userId: string; role: string; mustChangePassword?: boolean } | null = null;

  if (sessionCookie?.value) {
    try {
      const { payload } = await jwtVerify(sessionCookie.value, JWT_SECRET);
      isAuthenticated = true;
      session = payload as { userId: string; role: string; mustChangePassword?: boolean };
    } catch (error) {
      console.error('JWT verification failed:', error);
    }
  }

  // Not authenticated - redirect to login for protected routes
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated - redirect away from login page
  if (isAuthRoute && isAuthenticated) {
    // ADR 0002: Redirect to change-password if required, else dashboard
    if (session?.mustChangePassword) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }
    return NextResponse.redirect(new URL('/app/dashboard', request.url));
  }

  // ADR 0002: Force password change - redirect non-change-password routes
  if (isAuthenticated && session?.mustChangePassword && !isChangePasswordRoute && isProtectedRoute) {
    return NextResponse.redirect(new URL('/change-password', request.url));
  }

  // ADR 0002: RBAC - Block non-admin from admin-only routes
  if (isAdminOnlyRoute && isAuthenticated && session?.role !== 'ADMIN') {
    return NextResponse.redirect(new URL('/app', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$).*)',
  ],
};