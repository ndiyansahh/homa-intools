/**
 * CSRF (Cross-Site Request Forgery) Protection
 *
 * SECURITY: Prevents attackers from making unauthorized requests
 * on behalf of authenticated users.
 *
 * Implementation: Double Submit Cookie pattern
 * - Generate random CSRF token
 * - Store in HTTP-only cookie
 * - Require token in request header for mutations
 */

import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure random CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Set CSRF token in cookie
 * Call this during login or when serving pages that make mutations
 */
export async function setCSRFToken(): Promise<string> {
  const token = generateCSRFToken();
  const cookieStore = await cookies();

  cookieStore.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  });

  return token;
}

/**
 * Get CSRF token from cookie
 */
export async function getCSRFToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CSRF_COOKIE_NAME);
  return token?.value || null;
}

/**
 * Validate CSRF token from request
 *
 * Compares token in cookie with token in request header
 *
 * @param request - Next.js request object
 * @returns true if CSRF validation passes
 */
export async function validateCSRFToken(request: NextRequest): Promise<boolean> {
  // Get token from cookie
  const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;

  // Get token from header
  const headerToken = request.headers.get(CSRF_HEADER_NAME);

  // Both must exist
  if (!cookieToken || !headerToken) {
    return false;
  }

  // Tokens must match (constant-time comparison to prevent timing attacks)
  return crypto.timingSafeEqual(
    Buffer.from(cookieToken, 'utf-8'),
    Buffer.from(headerToken, 'utf-8')
  );
}

/**
 * Middleware helper: Check if route requires CSRF protection
 *
 * CSRF protection is required for:
 * - POST, PUT, DELETE, PATCH requests
 * - To API routes (excluding login/logout)
 *
 * @param request - Next.js request object
 * @returns true if CSRF protection should be enforced
 */
export function requiresCSRFProtection(request: NextRequest): boolean {
  const { pathname } = request.nextUrl;
  const method = request.method;

  // Only protect mutation methods
  const mutationMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];
  if (!method || !mutationMethods.includes(method)) {
    return false;
  }

  // Protect API routes
  if (!pathname.startsWith('/api/')) {
    return false;
  }

  // Exclude login/logout endpoints (they establish/destroy sessions)
  const excludedPaths = [
    '/api/auth/login',
    '/api/auth/logout',
  ];

  if (excludedPaths.some(path => pathname.startsWith(path))) {
    return false;
  }

  return true;
}

/**
 * Delete CSRF token (e.g., on logout)
 */
export async function deleteCSRFToken(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CSRF_COOKIE_NAME);
}
