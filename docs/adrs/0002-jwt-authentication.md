# ADR 0002: Use Custom JWT Authentication Instead of NextAuth

**Date:** 2025-12-05  
**Status:** ✅ Accepted  
**Deciders:** Handi, Team  
**Tags:** authentication, security, nextjs

---

## Context

We needed to implement authentication for the HOMA internal management system. The application requires:
- Secure login for staff (ADMIN, OWNER, STAFF roles)
- Session management
- Role-based access control (RBAC)
- Protection for API routes and pages
- HTTP-only cookies for security

**Main Options:**
1. NextAuth.js (most popular Next.js auth solution)
2. Custom JWT authentication
3. Clerk (third-party auth service)
4. Auth0 (enterprise auth service)

---

## Decision

We chose **Custom JWT Authentication** with HTTP-only cookies.

**Implementation:**
- JWT tokens for session management
- HTTP-only cookies for token storage
- Custom middleware for route protection
- Role-based authorization

---

## Consequences

### Positive ✅

**1. Full Control**
- Complete control over authentication flow
- Can customize exactly what we need
- No external dependencies for core auth
- Direct access to user data structure

**2. Simplicity**
```typescript
// Simple JWT creation
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { userId, role },
  process.env.JWT_SECRET,
  { expiresIn: '24h' }
);

// Store in HTTP-only cookie
cookies().set('session', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  maxAge: 86400 // 24 hours
});
```

**3. No Vendor Lock-in**
- Not dependent on NextAuth's architecture
- Easy to modify/extend
- No breaking changes from third-party updates

**4. Perfect for Internal Tool**
- We control all users (no OAuth needed)
- Simple role structure (ADMIN, OWNER, STAFF)
- No complex multi-provider setup needed

**5. Better Performance**
- No NextAuth database adapter overhead
- Fewer dependencies
- Lighter bundle size

**6. Security**
- HTTP-only cookies prevent XSS attacks
- Secure flag for HTTPS
- SameSite protection against CSRF
- Token expiration enforced

---

### Negative ⚠️

**1. More Manual Work**
- Need to implement own session management
- Manual rate limiting
- Manual password hashing
- Manual email verification (if needed)

**2. No Built-in OAuth**
- Can't easily add Google/Facebook login
- Would need manual OAuth implementation

**3. Security Responsibility**
- We're responsible for security best practices
- Need to stay updated on vulnerabilities
- No automatic security patches from NextAuth

**4. Less Features Out-of-Box**
- No built-in magic links
- No built-in email providers
- No built-in account linking

---

## Alternatives Considered

### NextAuth.js
**Pros:**
- Most popular Next.js auth solution
- Built-in OAuth providers
- Email magic links
- Database session support
- Automatic CSRF protection
- Well-documented

**Cons:**
- Heavy dependency (many packages)
- Opinionated structure
- Database adapter required for persistent sessions
- Overkill for simple internal tool
- Breaking changes between versions
- Complex setup for simple use case

**Why Rejected:**
Our use case is too simple for NextAuth. We don't need:
- Multiple OAuth providers
- Database session persistence
- Email verification flows
- Public user registration

NextAuth adds complexity we don't need.

---

### Clerk
**Pros:**
- Beautiful pre-built UI components
- Easy OAuth integration
- User management dashboard
- Email/SMS verification
- Great DX

**Cons:**
- Third-party service (vendor lock-in)
- Pricing scales with users
- External dependency
- Overkill for internal tool
- Need internet connection for auth

**Why Rejected:**
- This is an **internal tool**, not public SaaS
- Don't want external dependency for critical auth
- Don't need fancy user management UI
- Cost would increase over time

---

### Auth0
**Pros:**
- Enterprise-grade
- Highly secure
- Compliance certifications
- Advanced features (MFA, SSO)
- Global infrastructure

**Cons:**
- Expensive (starts at $25/month)
- Complex setup
- Overkill for our use case
- Vendor lock-in
- Need Auth0 account to login

**Why Rejected:**
- Way too expensive for internal tool
- Features we'll never use
- Adds complexity, not value

---

## Implementation Details

### JWT Token Structure
```typescript
interface JWTPayload {
  userId: number;
  role: 'ADMIN' | 'OWNER' | 'STAFF';
  iat: number;  // issued at
  exp: number;  // expiration
}
```

### Login Flow
```typescript
// src/app/api/auth/login/route.ts
export async function POST(req: Request) {
  const { email, password } = await req.json();
  
  // 1. Validate credentials
  const user = await validateUser(email, password);
  
  // 2. Create JWT token
  const token = jwt.sign(
    { userId: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
  
  // 3. Set HTTP-only cookie
  cookies().set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 86400
  });
  
  return Response.json({ userId: user.id, role: user.role });
}
```

### Middleware Protection
```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth';

export async function middleware(req: NextRequest) {
  const session = await verifySession(req);
  
  if (!session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }
  
  // Role-based access
  if (req.nextUrl.pathname.startsWith('/app/settings')) {
    if (session.role === 'STAFF') {
      return NextResponse.redirect(new URL('/app/dashboard', req.url));
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/app/:path*'
};
```

### Session Verification
```typescript
// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

export async function getSession() {
  const token = cookies().get('session')?.value;
  
  if (!token) return null;
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    return payload as JWTPayload;
  } catch (error) {
    return null;
  }
}
```

---

## Security Considerations

### Implemented ✅
1. **HTTP-only cookies** - Prevents XSS token theft
2. **Secure flag** - HTTPS only in production
3. **SameSite=Lax** - CSRF protection
4. **Short expiration** - 24 hours max
5. **bcrypt password hashing** - Secure password storage
6. **Rate limiting** - Prevent brute force (5 attempts / 15 min)
7. **Audit logging** - Track all auth events

### Future Enhancements 🔄
1. **Refresh tokens** - Long-lived sessions
2. **2FA/MFA** - Extra security layer
3. **Session revocation** - Logout from all devices
4. **IP-based restrictions** - Limit login locations

---

## Migration Path

If we ever need more features (e.g., OAuth), migration options:
1. **Keep JWT, add OAuth manually** - Use Passport.js
2. **Migrate to NextAuth** - Can migrate JWT cookies to NextAuth sessions
3. **Migrate to Clerk** - Clean migration path exists

**Migration Risk:** Low - JWT is standard, any provider can work with it

---

## Testing Strategy

**Authentication Tests:**
- [ ] Login with valid credentials
- [ ] Login with invalid credentials
- [ ] Rate limiting (>5 attempts)
- [ ] Token expiration
- [ ] Cookie security flags
- [ ] Role-based access control
- [ ] Logout clears session

**Security Tests:**
- [ ] XSS token theft prevention
- [ ] CSRF protection
- [ ] SQL injection in login
- [ ] Brute force protection

---

## Related Decisions

- **ADR 0004:** Asia/Jakarta Timezone (affects session timestamps)
- Future: Session management strategy (if we add refresh tokens)

---

## References

- JWT.io: https://jwt.io/
- OWASP Auth Cheatsheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware

---

## Review

**Next Review:** 2026-06-01  
**Success Criteria:**
- No security incidents
- Login flow simple and fast
- Easy to maintain

**Potential Changes:**
- Add OAuth if external users needed
- Add 2FA if security requirements increase

---

**Last Updated:** 2025-12-05  
**Author:** Handi