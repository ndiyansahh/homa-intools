/**
 * Input Sanitization Utilities
 *
 * SECURITY: Sanitize user input to prevent SQL injection, XSS, and other attacks
 *
 * Note: Drizzle ORM provides parameterized queries which protect against SQL injection
 * when using placeholders. However, direct string interpolation in ILIKE/LIKE queries
 * can still be vulnerable. This utility provides additional protection.
 */

/**
 * Sanitize input for SQL LIKE/ILIKE queries
 *
 * Escapes special SQL characters that could be used for injection:
 * - % (wildcard for any characters)
 * - _ (wildcard for single character)
 * - \ (escape character)
 * - ' (string delimiter)
 * - " (identifier delimiter)
 * - ; (statement separator)
 * - -- (comment start)
 *
 * @param input - User input string
 * @returns Sanitized string safe for SQL LIKE/ILIKE queries
 */
export function sanitizeSQLLike(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape backslashes first (to prevent double-escaping)
    .replace(/\\/g, '\\\\')
    // Escape SQL wildcards
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_')
    // Escape quotes
    .replace(/'/g, "''")  // SQL standard: escape single quote with double single quote
    .replace(/"/g, '\\"')
    // Remove potentially dangerous characters
    .replace(/;/g, '')
    .replace(/--/g, '')
    // Remove SQL keywords that could be used for injection
    .replace(/\b(OR|AND|UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b/gi, '')
    // Trim whitespace
    .trim()
    // Limit length to prevent DoS via extremely long inputs
    .substring(0, 255);
}

/**
 * Sanitize general text input (for customer names, addresses, etc.)
 *
 * Removes potentially dangerous HTML/JavaScript while preserving normal text
 *
 * @param input - User input string
 * @returns Sanitized string safe for storage and display
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    // Remove null bytes
    .replace(/\0/g, '')
    // Remove script tags and their content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove event handlers (onclick, onerror, etc.)
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: protocol (can be used for XSS)
    .replace(/data:text\/html/gi, '')
    // Encode HTML special characters
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Trim whitespace
    .trim();
}

/**
 * Sanitize numeric input
 *
 * @param input - User input (string or number)
 * @param options - Sanitization options
 * @returns Sanitized number or null if invalid
 */
export function sanitizeNumber(
  input: string | number | null | undefined,
  options: {
    min?: number;
    max?: number;
    allowDecimal?: boolean;
    allowNegative?: boolean;
  } = {}
): number | null {
  if (input === null || input === undefined || input === '') {
    return null;
  }

  const numValue = typeof input === 'string' ? parseFloat(input) : input;

  // Check if valid number
  if (isNaN(numValue) || !isFinite(numValue)) {
    return null;
  }

  // Check decimal constraint
  if (options.allowDecimal === false && numValue % 1 !== 0) {
    return null;
  }

  // Check negative constraint
  if (options.allowNegative === false && numValue < 0) {
    return null;
  }

  // Check min/max constraints
  if (options.min !== undefined && numValue < options.min) {
    return null;
  }
  if (options.max !== undefined && numValue > options.max) {
    return null;
  }

  return numValue;
}

/**
 * Sanitize email address
 *
 * @param input - User input email
 * @returns Sanitized email or null if invalid
 */
export function sanitizeEmail(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const sanitized = input.trim().toLowerCase();

  // Basic email validation regex
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  if (!emailRegex.test(sanitized)) {
    return null;
  }

  // Check for common injection patterns
  if (sanitized.includes('<') || sanitized.includes('>') || sanitized.includes('"') || sanitized.includes("'")) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize phone number (Indonesian format)
 *
 * @param input - User input phone
 * @returns Sanitized phone number (digits only) or null if invalid
 */
export function sanitizePhone(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, '');

  // Indonesian phone: 10-13 digits (including country code)
  if (digitsOnly.length < 10 || digitsOnly.length > 13) {
    return null;
  }

  return digitsOnly;
}

/**
 * Sanitize NIK (Indonesian National ID)
 *
 * @param input - User input NIK
 * @returns Sanitized NIK (16 digits) or null if invalid
 */
export function sanitizeNIK(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Remove all non-digit characters
  const digitsOnly = input.replace(/\D/g, '');

  // NIK must be exactly 16 digits
  if (digitsOnly.length !== 16) {
    return null;
  }

  return digitsOnly;
}

/**
 * Sanitize UUID
 *
 * @param input - User input UUID
 * @returns Sanitized UUID or null if invalid
 */
export function sanitizeUUID(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const sanitized = input.trim().toLowerCase();

  if (!uuidRegex.test(sanitized)) {
    return null;
  }

  return sanitized;
}

/**
 * Sanitize date string (YYYY-MM-DD format)
 *
 * @param input - User input date
 * @returns Sanitized date string or null if invalid
 */
export function sanitizeDate(input: string): string | null {
  if (!input || typeof input !== 'string') {
    return null;
  }

  // Accept YYYY-MM-DD format
  const dateRegex = /^(\d{4})-(\d{2})-(\d{2})$/;
  const match = input.match(dateRegex);

  if (!match) {
    return null;
  }

  const [, year, month, day] = match;
  const yearNum = parseInt(year, 10);
  const monthNum = parseInt(month, 10);
  const dayNum = parseInt(day, 10);

  // Validate ranges
  if (yearNum < 1900 || yearNum > 2100) return null;
  if (monthNum < 1 || monthNum > 12) return null;
  if (dayNum < 1 || dayNum > 31) return null;

  // Additional validation: check if date is valid
  const dateObj = new Date(yearNum, monthNum - 1, dayNum);
  if (
    dateObj.getFullYear() !== yearNum ||
    dateObj.getMonth() !== monthNum - 1 ||
    dateObj.getDate() !== dayNum
  ) {
    return null;
  }

  return input;
}
