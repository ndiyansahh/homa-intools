# Login & Authentication

**Last Updated:** January 30, 2026  
**Status:** Active  
**Related ADR:** [ADR 0002 - JWT Authentication](../adrs/0002-jwt-authentication.md)

---

## Overview

Homa Intools uses a custom JWT-based authentication system designed for internal use only. There is no public sign-up—all accounts are provisioned manually by Admins.

---

## Key Features

### 1. Manual User Provisioning
- **Admin-only:** Only users with `ADMIN` role can create new accounts
- **Temporary Password:** Admin sets an initial password for new users
- **Forced Password Change:** Users must change password on first login

### 2. Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| **ADMIN** | Full access, user provisioning, settings management |
| **OWNER** | Customer, Mitra, Payout management |
| **STAFF** | Limited to assigned operations, no settings access |

### 3. Security Features
- **Brute Force Protection:** 5 failed attempts → 15 minute lockout
- **HTTP-Only Cookies:** Session tokens stored securely
- **Edge-Compatible:** JWT verification in middleware (no DB calls)
- **bcrypt Hashing:** Minimum 10 rounds

---

## User Flows

### Login Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         LOGIN FLOW                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User → /login                                                   │
│     │                                                            │
│     ▼                                                            │
│  ┌──────────────────┐                                           │
│  │ Enter Credentials │                                           │
│  └────────┬─────────┘                                           │
│           │                                                      │
│           ▼                                                      │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ Check if Locked  │──Yes─▶│ Show Lockout Msg │                 │
│  └────────┬─────────┘      └──────────────────┘                 │
│           │ No                                                   │
│           ▼                                                      │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ Validate Password │──No──▶│ Increment Fails  │                 │
│  └────────┬─────────┘      │ (Lock if 5+)     │                 │
│           │ Yes             └──────────────────┘                 │
│           ▼                                                      │
│  ┌──────────────────┐      ┌──────────────────┐                 │
│  │ mustChangePassword│──Yes─▶│ /change-password │                 │
│  └────────┬─────────┘      └──────────────────┘                 │
│           │ No                                                   │
│           ▼                                                      │
│  ┌──────────────────┐                                           │
│  │ Create Session   │                                           │
│  │ Redirect to /app │                                           │
│  └──────────────────┘                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Admin Provisioning Flow

```
Admin → /app/settings/users → [Add User]
   │
   ▼
┌──────────────────────────┐
│ Enter User Details:      │
│ - Email                  │
│ - Temporary Password     │
│ - Role (STAFF/OWNER)     │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ System Creates User:     │
│ - Hash password (bcrypt) │
│ - mustChangePassword=true│
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│ Admin Shares Credentials │
│ (via secure channel)     │
└──────────────────────────┘
```

---

## API Endpoints

### `POST /api/auth/login`

Authenticates user and creates session.

**Request:**
```json
{
  "email": "staff@homa.id",
  "password": "temporary123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "staff@homa.id",
    "role": "STAFF"
  },
  "mustChangePassword": true
}
```

**Error Responses:**

| Status | Message | Cause |
|--------|---------|-------|
| 401 | "Invalid credentials" | Wrong email/password |
| 423 | "Account locked" | Too many failed attempts |
| 400 | "Email and password required" | Missing fields |

---

### `POST /api/auth/logout`

Clears session cookie.

**Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### `POST /api/auth/change-password`

Changes user password. Required on first login.

**Request:**
```json
{
  "currentPassword": "temporary123",
  "newPassword": "MySecure@Pass2026"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Validation Rules:**
- Minimum 8 characters
- Must contain uppercase, lowercase, number
- Cannot be same as current password

---

### `POST /api/auth/users` (Admin Only)

Creates a new user account.

**Request:**
```json
{
  "email": "newstaff@homa.id",
  "password": "TempPass123",
  "role": "STAFF"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newstaff@homa.id",
    "role": "STAFF",
    "mustChangePassword": true
  }
}
```

---

## File Structure

```
src/
├── app/
│   ├── login/
│   │   └── page.tsx           # Login page
│   ├── change-password/
│   │   └── page.tsx           # Force password change page
│   └── api/
│       └── auth/
│           ├── login/route.ts    # POST /api/auth/login
│           ├── logout/route.ts   # POST /api/auth/logout
│           ├── change-password/route.ts
│           └── users/route.ts    # Admin: create users
├── lib/
│   └── auth.ts                # JWT utilities (createSession, verifySession, getSession)
└── middleware.ts              # Route protection, RBAC
```

---

## Session Data Structure

```typescript
interface SessionData {
  userId: string;
  email: string;
  role: 'ADMIN' | 'OWNER' | 'STAFF';
  mustChangePassword: boolean;
  iat: number;  // Issued at
  exp: number;  // Expiration
}
```

---

## Security Considerations

### Password Storage
- All passwords hashed with **bcrypt** (10+ rounds)
- Plain text passwords never stored or logged

### Session Security
- **HTTP-Only Cookie:** Not accessible via JavaScript
- **SameSite=Lax:** CSRF protection
- **Secure=true:** HTTPS only in production
- **24-hour expiration**

### Lockout Policy
```
Failed Attempts: 1-4  → Show error, continue
Failed Attempts: 5    → Lock account for 15 minutes
After Lockout Expires → Reset failed attempts counter
```

### Error Messages
Always return generic messages to prevent user enumeration:
- ✅ "Invalid credentials"
- ❌ "User not found" or "Wrong password"

---

## Protected Routes

| Route Pattern | Required Role |
|---------------|---------------|
| `/app/*` | Any authenticated user |
| `/app/settings/*` | ADMIN only |
| `/app/users/*` | ADMIN only |
| `/change-password` | User with `mustChangePassword=true` |

---

## Future Enhancements

1. **Email Integration:** Add "Forgot Password" flow via SendGrid/Resend
2. **Session Revocation:** Add ability to invalidate all sessions
3. **Audit Logging:** Track login attempts and password changes
4. **MFA:** Optional two-factor authentication for ADMIN accounts
