# HOMA - Internal Management System

A Next.js application with secure authentication, role-based access control, and comprehensive app shell navigation.

## Features

### Authentication & Security
- ✅ Secure login with HTTP-only cookies
- ✅ JWT-based session management  
- ✅ Route protection middleware
- ✅ Role-based access control (ADMIN, OWNER, STAFF)
- ✅ Rate limiting for login attempts
- ✅ Comprehensive audit logging
- ✅ Asia/Jakarta timezone support
- ✅ Form validation and error handling

### App Shell & Navigation
- ✅ Fixed left sidebar with navigation menu
- ✅ Topbar with breadcrumbs and user info
- ✅ Active menu state highlighting
- ✅ Role-based menu visibility (server-driven)
- ✅ Mobile-responsive design with hamburger menu
- ✅ Navigation event tracking
- ✅ Accessibility landmarks and ARIA labels

### Technical Implementation
- ✅ TypeScript implementation
- ✅ Responsive UI with Tailwind CSS
- ✅ Server Components (RSC) architecture
- ✅ Minimal client-side JavaScript

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env.local
   ```
   Update the JWT_SECRET in `.env.local` with a secure key (minimum 32 characters).

3. **Run the development server:**
   ```bash
   npm run dev
   ```

4. **Access the application:**
   - Open [http://localhost:3000](http://localhost:3000)
   - You'll be redirected to the login page

## Demo Credentials

Use these credentials to test the application:

| Role  | Email           | Password |
|-------|-----------------|----------|
| ADMIN | admin@homa.com  | admin123 |
| OWNER | owner@homa.com  | owner123 |
| STAFF | staff@homa.com  | staff123 |

## API Endpoints

### POST /api/auth/login
Login endpoint that validates credentials and creates a session.

**Request:**
```json
{
  "email": "admin@homa.com",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "userId": "1",
  "role": "ADMIN"
}
```

**Error (401):**
```json
{
  "error": "INVALID_CREDENTIALS"
}
```

### POST /api/auth/logout
Logout endpoint that destroys the session cookie.

**Response:** 204 No Content

## Routes

- `/` - Redirects to login or dashboard based on auth status
- `/login` - Login page
- `/app/*` - Protected routes (requires authentication)
- `/app/dashboard` - Main dashboard with quick navigation
- `/app/trial` - Trial management module
- `/app/customers` - Customers & visits tracking
- `/app/attendance` - Staff attendance management
- `/app/payouts` - Payment and payout management
- `/app/settings` - System configuration (ADMIN/OWNER only)

## Security Features

- **HTTP-only cookies** prevent XSS attacks
- **JWT tokens** with expiration (24 hours)
- **Rate limiting** prevents brute force attacks (5 attempts per 15 minutes)
- **CSRF protection** through SameSite cookie policy
- **Audit logging** for all authentication events
- **Input validation** on all forms
- **Middleware protection** for all app routes

## Development

```bash
# Run development server
npm run dev

# Build for production  
npm run build

# Type checking
npm run type-check

# Linting
npm run lint
```

## Architecture

The application follows Next.js 13+ App Router conventions:

```
src/
├── app/                    # Next.js app directory
│   ├── api/auth/          # Authentication API routes
│   ├── app/               # Protected application routes
│   │   ├── dashboard/     # Main dashboard
│   │   ├── trial/         # Trial management
│   │   ├── customers/     # Customer tracking
│   │   ├── attendance/    # Staff attendance
│   │   ├── payouts/       # Payment management
│   │   ├── settings/      # System configuration
│   │   └── layout.tsx     # App shell wrapper
│   ├── login/             # Login page
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page redirect
├── components/             # React components
│   ├── app-shell.tsx      # Main app shell layout
│   ├── sidebar.tsx        # Navigation sidebar
│   ├── topbar.tsx         # Top navigation bar
│   ├── login-form.tsx     # Login form component
│   └── page-placeholder.tsx # Placeholder component
├── lib/                   # Utility libraries
│   ├── auth.ts            # Session management
│   ├── users.ts           # User store (demo)
│   ├── navigation.ts      # Navigation configuration
│   ├── rate-limit.ts      # Rate limiting
│   └── logger.ts          # Audit logging
└── types/                 # TypeScript definitions
    ├── auth.ts            # Authentication types
    └── navigation.ts      # Navigation types
```

## Deployment

1. Build the application:
   ```bash
   npm run build
   ```

2. Set environment variables in your deployment platform:
   - `JWT_SECRET`: Secure random string (minimum 32 characters)
   - `NODE_ENV`: `production`

3. Deploy using your preferred platform (Vercel, Railway, etc.)

## Security Considerations

- Change the JWT_SECRET in production to a cryptographically secure random string
- Use HTTPS in production
- Consider implementing additional security headers
- Monitor authentication logs for suspicious activity
- Implement proper user account lockout policies
- Regular security audits and dependency updates