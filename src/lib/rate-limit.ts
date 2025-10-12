interface RateLimitStore {
  [key: string]: {
    attempts: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkRateLimit(identifier: string): { success: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `login:${identifier}`;
  
  if (!store[key]) {
    store[key] = {
      attempts: 0,
      resetTime: now + WINDOW_MS,
    };
  }

  const record = store[key];

  if (now > record.resetTime) {
    record.attempts = 0;
    record.resetTime = now + WINDOW_MS;
  }

  if (record.attempts >= MAX_ATTEMPTS) {
    return {
      success: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  record.attempts++;
  
  return {
    success: true,
    remaining: MAX_ATTEMPTS - record.attempts,
    resetTime: record.resetTime,
  };
}

export function resetRateLimit(identifier: string): void {
  const key = `login:${identifier}`;
  delete store[key];
}