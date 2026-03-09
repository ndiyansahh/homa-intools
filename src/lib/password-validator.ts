/**
 * Password Validation Utilities
 *
 * SECURITY: Enforce strong password requirements to prevent brute force attacks
 *
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 128; // Prevent DoS via extremely long passwords

/**
 * Validate password strength
 *
 * @param password - The password to validate
 * @returns Validation result with detailed error messages
 */
export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Check if password exists
  if (!password) {
    return {
      isValid: false,
      errors: ['Password is required'],
    };
  }

  // Check length
  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must not exceed ${PASSWORD_MAX_LENGTH} characters`);
  }

  // Check for uppercase letter
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  // Check for lowercase letter
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  // Check for number
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  // Check for special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character (!@#$%^&*()_+-=[]{};\':"|,.<>/?)');
  }

  // Check for common weak passwords
  const commonPasswords = [
    'password', 'password123', '12345678', 'qwerty', 'abc123',
    'letmein', 'welcome', 'monkey', '1234567890', 'admin',
  ];

  if (commonPasswords.some(weak => password.toLowerCase().includes(weak))) {
    errors.push('Password contains common patterns and is too weak');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get password strength score (0-4)
 *
 * @param password - The password to score
 * @returns Strength score: 0 (very weak) to 4 (very strong)
 */
export function getPasswordStrength(password: string): number {
  let score = 0;

  if (!password) return 0;

  // Length bonus
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (password.length >= 16) score++;

  // Character variety bonus
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++;

  // Penalize for common patterns
  if (/(.)\1{2,}/.test(password)) score--; // Repeated characters (aaa, 111)
  if (/012|123|234|345|456|567|678|789|890/.test(password)) score--; // Sequential numbers
  if (/abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz/i.test(password)) score--; // Sequential letters

  // Normalize to 0-4 range
  return Math.max(0, Math.min(4, score));
}

/**
 * Get human-readable password strength label
 *
 * @param password - The password to evaluate
 * @returns Strength label
 */
export function getPasswordStrengthLabel(password: string): string {
  const strength = getPasswordStrength(password);

  switch (strength) {
    case 0:
      return 'Very Weak';
    case 1:
      return 'Weak';
    case 2:
      return 'Fair';
    case 3:
      return 'Strong';
    case 4:
      return 'Very Strong';
    default:
      return 'Unknown';
  }
}
