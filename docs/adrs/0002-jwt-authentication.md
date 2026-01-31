# ADR 0002: Custom JWT Authentication with Manual Provisioning

**Date:** 2026-01-30  
**Status:** ✅ Accepted  
**Supersedes:** N/A  
**Deciders:** Handi, Staff Engineer (AI)  
**Tags:** security, authentication, jwt, nextjs-14, rbac, manual-provisioning

---

## Context

We are building **Homa Intools**, an internal management system. Access is restricted to employees (Admin, Owner, Staff) and strictly controlled.

**Current Constraints:**
1.  **Internal Use Only:** No public sign-up. Access is granted solely by Admins.
2.  **Tech Stack:** Next.js 14 (App Router), Drizzle ORM, Neon (Serverless Postgres).
3.  **Infrastructure:** No transactional email service (SendGrid/Resend) is currently configured.
4.  **Edge Compatibility:** Authentication must run efficiently in Next.js Middleware (Edge Runtime).

**Problem Statement:**
Existing solutions like NextAuth.js or Clerk are either "overkill" (too many features for a simple internal tool), create vendor lock-in, or conflict with the specific "Manual Provisioning" workflow we need (where Admins set temporary passwords that Users *must* change).

**Requirements:**
-   **Manual Provisioning:** Admins create accounts for Staff/Owners.
-   **Non-Repudiation:** Users must change their admin-assigned password immediately upon first login.
-   **Brute Force Protection:** Adherence to OWASP standards (lockout after N failed attempts).
-   **Role-Based Access Control (RBAC):** Strict separation between Admin, Owner, and Staff permissions.

---

## Decision

We will implement a **Custom Authentication System** using the **Hybrid Token Pattern** combined with a **Forced Password Rotation** flow.

**Key Decisions:**
1.  **Authentication Engine:** Custom JWT implementation using `jose` (standard for Next.js Edge).
2.  **Session Strategy:** HTTP-Only Cookies (Stateless Read / Stateful Write).
3.  **Account Creation:** Manual Provisioning by Admin (with Temporary Password).
4.  **Security Enforcer:** Mandatory password change on first login.

---

## Consequences

### Positive ✅

**1. Full Control & Lightweight**
We avoid the heavy dependencies of NextAuth.js. We have complete control over the login flow, allowing us to enforce specific business logic like "Account Lockout after 5 attempts" and "Forced Password Change" without fighting a library's defaults.

**2. Serverless Optimization (Neon)**
By verifying JWT signatures in Edge Middleware (Stateless), we avoid hitting the database on every page navigation. This drastically reduces connection pooling issues and costs on Neon.

**3. Zero External Dependencies**
We do not rely on third-party services (Auth0/Clerk) or Email APIs to launch. The system is self-contained.

**4. Enhanced Security (Non-Repudiation)**
The "Force Change Password" mechanism ensures that even though Admins create the accounts, they do not retain knowledge of the Staff's permanent passwords.

---

### Negative ⚠️

**1. Manual Responsibility**
We are responsible for implementing standard security features manually (Rate Limiting, Hashing, Session Management) that frameworks like NextAuth usually handle out-of-the-box.

**2. No "Forgot Password" Flow**
Since we don't have email integration yet, if a user forgets their password, an Admin must manually reset it.

---

## Alternatives Considered

### Option 1: NextAuth.js (Auth.js)
**Pros:** Industry standard, built-in OAuth.
**Cons:**
-   Complex setup for "Credentials Only" flow.
-   Database adapters can be heavy on Serverless connections.
-   Harder to implement the "Force Change Password" interceptor logic cleanly.
**Why Rejected:** Too opinionated and complex for a strictly internal tool.

### Option 2: Clerk / Auth0
**Pros:** Ready-to-use UI, MFA support.
**Cons:** Expensive (Pricing per user), Vendor Lock-in, Overkill features.
**Why Rejected:** We want to keep the stack self-hosted and cost-efficient.

### Option 3: Custom Auth with `jsonwebtoken`
**Pros:** Familiar syntax.
**Cons:** `jsonwebtoken` library has compatibility issues with Next.js Edge Runtime (Middleware).
**Why Rejected:** We upgraded to `jose` (Web Crypto API standard) for better Next.js 14 support.

---

## Implementation Details

### 1. Token Strategy (`src/lib/auth.ts`)

Using `jose` for Edge compatibility.

```typescript
import { SignJWT, jwtVerify } from 'jose';

const ALG = 'HS256';
const encodedKey = new TextEncoder().encode(process.env.JWT_SECRET);

// 🍪 Session is stored in HTTP-Only Cookie
export async function createSession(userId: string, role: string) {
  const token = await new SignJWT({ userId, role })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(encodedKey);
  
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, encodedKey, { algorithms: [ALG] });
  return payload as SessionData;
}
```

### 2. Database Schema (`src/lib/schema.ts`)

Extensions to the User table to support security requirements.

```typescript
// 🛡️ Security Columns
import { boolean, timestamp, integer, pgTable, text, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('STAFF'), // ADMIN, OWNER, STAFF
  
  // 🛡️ Security Fields
  mustChangePassword: boolean('must_change_password').default(true).notNull(),
  failedLoginAttempts: integer('failed_login_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until', { mode: 'date' }),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### 3. Middleware Logic (`middleware.ts`)

- **Read:** Verify JWT signature only (Fast, No DB call).
- **Protect:** Block STAFF from accessing `/app/settings`.

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('session')?.value;
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  
  try {
    const session = await verifySession(token);
    
    // RBAC: Block non-admin from settings
    if (request.nextUrl.pathname.startsWith('/app/settings') && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/app', request.url));
    }
    
    // Force password change redirect
    if (session.mustChangePassword && !request.nextUrl.pathname.startsWith('/change-password')) {
      return NextResponse.redirect(new URL('/change-password', request.url));
    }
    
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/app/:path*'],
};
```

### 4. Security Rules (OWASP)

| Rule | Implementation |
|------|----------------|
| **Hashing** | bcrypt (min 10 rounds) |
| **Rate Limit** | 5 Failed Attempts → 15 Minute Lockout |
| **Feedback** | Generic error messages ("Invalid credentials") |
| **Session** | HTTP-Only Cookie, SameSite=Lax, Secure in Prod |

---

## Related Decisions

- **ADR 0004:** Asia/Jakarta Timezone (affects session timestamps and lockout logic).

---

## References

- [Next.js Authentication Patterns](https://nextjs.org/docs/app/building-your-application/authentication)
- [OWASP Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)
- [jose Library Documentation](https://github.com/panva/jose)

---

## Review

**Next Review:** 2026-02-17 (End of Sprint 6)

**Success Criteria:**
- [ ] Admin can provision a user.
- [ ] Staff is forced to change password on first login.
- [ ] Middleware successfully blocks unauthorized access to Admin pages.

---

**Last Updated:** 2026-01-30  
**Author:** Handi