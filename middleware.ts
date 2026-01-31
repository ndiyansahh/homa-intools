import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

const protectedRoutes = ['/app'];
const authRoutes = ['/login'];
const changePasswordRoute = '/change-password';

// ADR 0002: RBAC - Admin-only routes
const adminOnlyRoutes = ['/app/settings', '/app/users'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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