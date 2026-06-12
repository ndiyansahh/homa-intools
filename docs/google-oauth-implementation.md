# Google OAuth Implementation - Context Doc

**Date:** 2026-06-12
**Status:** In Progress — SSH tunnel issue blocking local test

---

## What We're Building

Adding Google OAuth as a second login method alongside existing email/password. Strategy: **Option A** — only pre-existing emails in `user_db` can login via Google. No self-registration.

---

## Files Created/Modified

### New Files
- `src/lib/auth-config.ts` — NextAuth v5 config with Google provider. `signIn` callback queries `user_db` by email, creates our custom JWT session cookie.
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler (GET + POST)
- `src/app/api/auth/google-session/route.ts` — Fallback route (may not be needed)
- `src/components/session-provider.tsx` — NextAuth SessionProvider wrapper for client components

### Modified Files
- `src/components/login-form.tsx` — Added "Continue with Google" button above email form, Google error messages from URL params
- `src/app/layout.tsx` — Wrapped children with `AuthSessionProvider`
- `src/lib/csrf.ts` — Excluded all `/api/auth/*` from CSRF protection (was only excluding login/logout)
- `middleware.ts` — Excluded all `/api/auth/*` from rate limiting
- `scripts/seed-users.ts` — Replaced placeholder accounts with real users
- `.env.local` — Added Google OAuth credentials + AUTH_SECRET + AUTH_URL

### Unchanged
- `src/lib/auth.ts` — Custom JWT session (createSession, getSession, etc.) — untouched
- `middleware.ts` — RBAC logic — untouched

---

## Current Users in Production DB

| Email | Role | Password |
|-------|------|----------|
| handi.docss@gmail.com | ADMIN | handiHoma2026! |
| christian@homa.co.id | OWNER | imsHoma2026! |
| dara@homa.co.id | STAFF | daraHoma2026! |

Seed script already run on production VPS successfully.

---

## Environment Variables Added to `.env.local`

```
GOOGLE_CLIENT_ID=<your-google-client-id>
GOOGLE_CLIENT_SECRET=<your-google-client-secret>
AUTH_SECRET=<min-32-char-random-secret>
AUTH_URL=http://localhost:3000
```

**Note:** Same credentials need to be added to VPS `.env` files for staging and production.

---

## Google Cloud Console Setup

- **Project:** handi-project-vendor
- **Account:** handi.docss@gmail.com
- **OAuth Type:** External (but only pre-existing DB users can login — safe)
- **Test users:** Must add `handi.docss@gmail.com` in Audience → Test users
- **Authorized JS Origins:** `http://localhost:3000`, `https://internal.homa.co.id`, `https://staging.homa.co.id`
- **Authorized Redirect URIs:**
  - `http://localhost:3000/api/auth/callback/google`
  - `https://internal.homa.co.id/api/auth/callback/google`
  - `https://staging.homa.co.id/api/auth/callback/google`

---

## Current Blocker

Local `.env.local` DATABASE_URL points to production DB via port 5433:
```
DATABASE_URL="postgresql://homa_user:HomaDB2025Secure@localhost:5433/homa_production"
```

Requires SSH tunnel to be active:
```bash
ssh -f -N -L 5433:localhost:5432 root@194.233.68.67
```

Previous tunnel attempt (PID 3081) was suspended (status T). Need to kill and restart:
```bash
kill 3081 && ssh -f -N -L 5433:localhost:5432 root@194.233.68.67
```

---

## How Auth Flow Works

1. User clicks "Continue with Google"
2. `signIn('google', { callbackUrl: '/app/dashboard' })` → redirects to Google
3. Google redirects back to `/api/auth/callback/google`
4. NextAuth `signIn` callback fires:
   - Queries `user_db` by email
   - If not found or inactive → return `false` → redirect to `/login?error=AccessDenied`
   - If found → `createSession()` sets our custom JWT cookie → return `true`
5. NextAuth `redirect` callback → `/app/dashboard`
6. Middleware reads our JWT cookie → user is authenticated

---

## Next Steps After Tunnel Fixed

1. Test Google login locally with `handi.docss@gmail.com`
2. Verify redirect to `/app/dashboard` works
3. Commit and push to main branch
4. SSH to VPS and add Google env vars to `/var/www/homa-production/.env`
5. Rebuild and restart PM2 on production
6. Test on `https://internal.homa.co.id`

---

## VPS Env Variables to Add

SSH to VPS and run:
```bash
cd /var/www/homa-production
# Add these to .env file:
echo 'GOOGLE_CLIENT_ID=<your-google-client-id>' >> .env
echo 'GOOGLE_CLIENT_SECRET=<your-google-client-secret>' >> .env
echo 'AUTH_SECRET=homa-nextauth-secret-2026-secure-key-min32' >> .env
echo 'AUTH_URL=https://internal.homa.co.id' >> .env

# Then rebuild
npm run build
pm2 restart homa-production
```

Same for staging with `AUTH_URL=https://staging.homa.co.id`.
