/**
 * Rate Limiting System
 *
 * SECURITY: Prevent brute force attacks and API abuse by limiting request rates
 *
 * Policies:
 * - Login: 5 attempts per 15 minutes
 * - API mutations: 100 requests per 15 minutes (per IP)
 * - Password change: 3 attempts per hour (per user)
 */

interface RateLimitStore {
  [key: string]: {
    attempts: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// Rate limit policies
const POLICIES = {
  login: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  api: {
    maxAttempts: 100,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  passwordChange: {
    maxAttempts: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
};

export type RateLimitPolicy = keyof typeof POLICIES;

/**
 * Check rate limit for a specific policy and identifier
 *
 * @param policy - Which rate limit policy to apply
 * @param identifier - Unique identifier (IP address, user ID, etc.)
 * @returns Rate limit result with success status and metadata
 */
export function checkRateLimit(
  identifier: string,
  policy: RateLimitPolicy = 'login'
): { success: boolean; remaining: number; resetTime: number } {
  const config = POLICIES[policy];
  const now = Date.now();
  const key = `${policy}:${identifier}`;

  if (!store[key]) {
    store[key] = {
      attempts: 0,
      resetTime: now + config.windowMs,
    };
  }

  const record = store[key];

  // Reset if window expired
  if (now > record.resetTime) {
    record.attempts = 0;
    record.resetTime = now + config.windowMs;
  }

  // Check if limit exceeded
  if (record.attempts >= config.maxAttempts) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Increment and allow
  record.attempts++;

  return {
    success: true,
    remaining: config.maxAttempts - record.attempts,
    resetTime: record.resetTime,
  };
}

/**
 * Reset rate limit for a specific identifier and policy
 *
 * @param identifier - Unique identifier
 * @param policy - Which rate limit policy to reset
 */
export function resetRateLimit(identifier: string, policy: RateLimitPolicy = 'login'): void {
  const key = `${policy}:${identifier}`;
  delete store[key];
}

/**
 * Clean up expired rate limit records
 * Should be called periodically to prevent memory leaks
 */
export function cleanupExpiredRecords(): void {
  const now = Date.now();
  for (const key in store) {
    if (now > store[key].resetTime + 60000) { // Extra 1 minute grace period
      delete store[key];
    }
  }
}

// Auto-cleanup every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(cleanupExpiredRecords, 10 * 60 * 1000);
}