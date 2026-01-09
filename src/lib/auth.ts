import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { SessionData, UserRole } from '@/types/auth';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-change-this-in-production'
);

const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 24 * 60 * 60; // 24 hours in seconds

export async function createSession(userId: string, role: UserRole, email: string) {
  const sessionData: SessionData = {
    userId,
    role,
    email,
    loginTime: new Date().toISOString(),
  };

  const token = await new SignJWT(sessionData)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    // Use HTTPS detection: only set secure cookie if using HTTPS
    // This allows staging (HTTP) and production (HTTPS) to work properly
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ?? false,
    sameSite: 'lax',
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
    .setExpirationTime('24h')
    .sign(JWT_SECRET);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, newToken, {
    httpOnly: true,
    // Use HTTPS detection: only set secure cookie if using HTTPS
    secure: process.env.NEXT_PUBLIC_APP_URL?.startsWith('https://') ?? false,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return newToken;
}