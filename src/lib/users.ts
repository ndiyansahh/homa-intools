import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { userDB } from '@/lib/schema';
import { eq } from 'drizzle-orm';
import { User, UserRole } from '@/types/auth';

const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes (ADR 0002)
const MAX_FAILED_ATTEMPTS = 5; // ADR 0002

// Fallback demo users (used when database not migrated yet)
const DEMO_USERS: Record<string, { id: string; email: string; password: string; role: UserRole }> = {
  'admin@homa.com': { id: 'demo-admin', email: 'admin@homa.com', password: 'admin123', role: 'ADMIN' },
  'owner@homa.com': { id: 'demo-owner', email: 'owner@homa.com', password: 'owner123', role: 'OWNER' },
  'staff@homa.com': { id: 'demo-staff', email: 'staff@homa.com', password: 'staff123', role: 'STAFF' },
};

export interface ValidateUserResult {
  user: User | null;
  error?: 'INVALID_CREDENTIALS' | 'ACCOUNT_LOCKED';
  lockedUntil?: Date;
}

/**
 * Validates user credentials against database
 * Falls back to demo users if database not available
 * Implements lockout after 5 failed attempts (ADR 0002)
 */
export async function validateUser(email: string, password: string): Promise<ValidateUserResult> {
  try {
    // Try database first
    const users = await db
      .select()
      .from(userDB)
      .where(eq(userDB.email, email))
      .limit(1);

    if (users.length === 0) {
      // Fallback to demo users if no user in DB
      return validateDemoUser(email, password);
    }

    const dbUser = users[0];

    // Check if account is locked
    if (dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
      return {
        user: null,
        error: 'ACCOUNT_LOCKED',
        lockedUntil: dbUser.lockedUntil
      };
    }

    // Check if account is active
    if (!dbUser.isActive) {
      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    // Validate password
    const isValidPassword = await bcrypt.compare(password, dbUser.passwordHash);

    if (!isValidPassword) {
      // Increment failed attempts
      const newFailedAttempts = (dbUser.failedLoginAttempts || 0) + 1;

      if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
        // Lock account
        const lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        await db
          .update(userDB)
          .set({
            failedLoginAttempts: newFailedAttempts,
            lockedUntil,
            updatedAt: new Date()
          })
          .where(eq(userDB.id, dbUser.id));

        return {
          user: null,
          error: 'ACCOUNT_LOCKED',
          lockedUntil
        };
      } else {
        await db
          .update(userDB)
          .set({
            failedLoginAttempts: newFailedAttempts,
            updatedAt: new Date()
          })
          .where(eq(userDB.id, dbUser.id));
      }

      return { user: null, error: 'INVALID_CREDENTIALS' };
    }

    // Successful login - reset failed attempts
    await db
      .update(userDB)
      .set({
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(userDB.id, dbUser.id));

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role as UserRole,
        mustChangePassword: dbUser.mustChangePassword,
      }
    };

  } catch (error) {
    console.error('Database error, falling back to demo users:', error);
    // Fallback to demo users if database error (table doesn't exist)
    return validateDemoUser(email, password);
  }
}

/**
 * Fallback validation for demo users (before migration)
 */
function validateDemoUser(email: string, password: string): ValidateUserResult {
  const demoUser = DEMO_USERS[email];

  if (!demoUser || demoUser.password !== password) {
    return { user: null, error: 'INVALID_CREDENTIALS' };
  }

  return {
    user: {
      id: demoUser.id,
      email: demoUser.email,
      role: demoUser.role,
      mustChangePassword: false, // Demo users don't need password change
    }
  };
}

/**
 * Get user by ID from database
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const users = await db
      .select()
      .from(userDB)
      .where(eq(userDB.id, id))
      .limit(1);

    if (users.length === 0) {
      return null;
    }

    const dbUser = users[0];
    return {
      id: dbUser.id,
      email: dbUser.email,
      role: dbUser.role as UserRole,
      mustChangePassword: dbUser.mustChangePassword,
    };
  } catch (error) {
    console.error('Error getting user by ID:', error);
    return null;
  }
}

/**
 * Create a new user (Admin only)
 */
export async function createUser(
  email: string,
  password: string,
  role: UserRole
): Promise<User | null> {
  try {
    const passwordHash = await bcrypt.hash(password, 10);

    const result = await db
      .insert(userDB)
      .values({
        email,
        passwordHash,
        role,
        mustChangePassword: true, // ADR 0002: Force password change on first login
        failedLoginAttempts: 0,
      })
      .returning();

    if (result.length === 0) {
      return null;
    }

    const newUser = result[0];
    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
      mustChangePassword: newUser.mustChangePassword,
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return null;
  }
}

/**
 * Change user password
 */
export async function changeUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user
    const users = await db
      .select()
      .from(userDB)
      .where(eq(userDB.id, userId))
      .limit(1);

    if (users.length === 0) {
      return { success: false, error: 'User not found' };
    }

    const dbUser = users[0];

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, dbUser.passwordHash);
    if (!isValidPassword) {
      return { success: false, error: 'Current password is incorrect' };
    }

    // Validate new password
    if (newPassword.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' };
    }

    // Check for uppercase, lowercase, and number
    if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return { success: false, error: 'Password must contain uppercase, lowercase, and number' };
    }

    // Check if new password is same as current
    if (currentPassword === newPassword) {
      return { success: false, error: 'New password must be different from current password' };
    }

    // Hash new password and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db
      .update(userDB)
      .set({
        passwordHash,
        mustChangePassword: false,
        updatedAt: new Date()
      })
      .where(eq(userDB.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Error changing password:', error);
    return { success: false, error: 'Failed to change password' };
  }
}

/**
 * Reset password (Admin only) - sets mustChangePassword = true
 */
export async function resetUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const passwordHash = await bcrypt.hash(newPassword, 10);

    await db
      .update(userDB)
      .set({
        passwordHash,
        mustChangePassword: true,
        failedLoginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date()
      })
      .where(eq(userDB.id, userId));

    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error: 'Failed to reset password' };
  }
}