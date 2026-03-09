import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SessionData, UserRole } from '@/types/auth';
import { getJwtSecret } from './env-validation';

// SECURITY: JWT_SECRET validation enforced at startup
// No fallback - application will not start if JWT_SECRET is missing or weak
const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

const COOKIE_NAME = 'session';
// SECURITY FIX: Reduced from 24 hours to 4 hours to limit session hijacking window
const COOKIE_MAX_AGE = 4 * 60 * 60; // 4 hours in seconds (configurable via env)

// ADR 0002: Added mustChangePassword parameter
export async function createSession(
  userId: string,
  role: UserRole,
  email: string,
  mustChangePassword: boolean = false
) {
  const sessionData: SessionData = {
    userId,
    role,
    email,
    mustChangePassword, // ADR 0002
    loginTime: new Date().toISOString(),
  };

  const token = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h') // SECURITY FIX: Reduced from 24h to 4h
    .sign(JWT_SECRET);

  const cookieStore = await cookies();

  // SECURITY: Force secure cookies in production
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ?? false;

  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    // SECURITY FIX: Always use secure=true in production, regardless of URL config
    // In development, allow HTTP for local testing
    secure: isProduction ? true : isHttps,
    // SECURITY FIX: Use 'strict' for better CSRF protection (changed from 'lax')
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return token;
}

export async function getSession(): Promise<SessionData | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return null;
    }

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionData;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function refreshSession() {
  const session = await getSession();
  if (!session) {
    return null;
  }

  const newToken = await new SignJWT(session)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('4h') // SECURITY FIX: Reduced from 24h to 4h
    .sign(JWT_SECRET);

  const cookieStore = await cookies();

  // SECURITY: Force secure cookies in production
  const isProduction = process.env.NODE_ENV === 'production';
  const isHttps = process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ?? false;

  cookieStore.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    // SECURITY FIX: Always use secure=true in production
    secure: isProduction ? true : isHttps,
    // SECURITY FIX: Use 'strict' for better CSRF protection
    sameSite: 'strict',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return newToken;
}

// For middleware - verify token without setting cookies
export async function verifySession(token: string): Promise<SessionData | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionData;
  } catch {
    return null;
  }
}