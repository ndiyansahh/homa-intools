/**
 * Environment Variable Validation
 *
 * CRITICAL: This file validates required environment variables at startup
 * to prevent security vulnerabilities from misconfiguration.
 *
 * Security Note: Missing or weak JWT_SECRET allows complete authentication bypass.
 */

const INSECURE_JWT_SECRETS = [
  'your-secret-key-change-this-in-production',
  'your-super-secret-jwt-key-change-this-in-production-minimum-32-characters',
  'secret',
  'jwt-secret',
  'change-me',
  'test',
  'development',
];

/**
 * Validates that all required environment variables are set
 * Throws error to prevent application startup if validation fails
 */
export function validateEnvironmentVariables() {
  const errors: string[] = [];

  // 1. JWT_SECRET validation (CRITICAL)
  if (!process.env.JWT_SECRET) {
    errors.push('❌ CRITICAL: JWT_SECRET environment variable is not set');
  } else if (process.env.JWT_SECRET.length < 32) {
    errors.push('❌ CRITICAL: JWT_SECRET must be at least 32 characters long');
  } else if (INSECURE_JWT_SECRETS.includes(process.env.JWT_SECRET)) {
    errors.push('❌ CRITICAL: JWT_SECRET is using a default/insecure value. Generate a strong random secret!');
  }

  // 2. Database URL validation (CRITICAL)
  if (!process.env.DATABASE_URL) {
    errors.push('❌ CRITICAL: DATABASE_URL environment variable is not set');
  }

  // 3. Production-specific validations
  if (process.env.NODE_ENV === 'production') {
    // Ensure HTTPS in production
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      errors.push('⚠️  WARNING: NEXT_PUBLIC_APP_URL is not set. Secure cookies may not work properly.');
    } else if (!process.env.NEXT_PUBLIC_APP_URL.startsWith('https://')) {
      errors.push('❌ CRITICAL: NEXT_PUBLIC_APP_URL must use HTTPS in production');
    }
  }

  // If there are any errors, throw to prevent startup
  if (errors.length > 0) {
    const errorMessage = [
      '',
      '═══════════════════════════════════════════════════════════',
      '  🚨 ENVIRONMENT VALIDATION FAILED - APPLICATION CANNOT START',
      '═══════════════════════════════════════════════════════════',
      '',
      ...errors,
      '',
      'Required Actions:',
      '1. Create .env.local file (copy from .env.example)',
      '2. Generate strong JWT_SECRET: openssl rand -base64 48',
      '3. Set DATABASE_URL to your PostgreSQL connection string',
      '4. Set NEXT_PUBLIC_APP_URL to your application URL',
      '',
      'Example .env.local:',
      '  JWT_SECRET=<strong-random-string-min-32-chars>',
      '  DATABASE_URL=postgresql://user:password@host:5432/dbname',
      '  NEXT_PUBLIC_APP_URL=https://your-domain.com',
      '',
      '═══════════════════════════════════════════════════════════',
      '',
    ].join('\n');

    throw new Error(errorMessage);
  }

  // Success - log validation passed
  if (process.env.NODE_ENV === 'production') {
    console.log('✅ Environment validation passed - All required variables configured');
  }
}

/**
 * Get validated JWT secret
 * Only call this after validateEnvironmentVariables() has been called
 */
export function getJwtSecret(): string {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET not set - this should have been caught by environment validation');
  }
  return process.env.JWT_SECRET;
}
