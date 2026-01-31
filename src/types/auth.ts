export type UserRole = 'ADMIN' | 'OWNER' | 'STAFF';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  role: UserRole;
  mustChangePassword: boolean; // ADR 0002: Force password change
}

export interface LoginError {
  error: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'ACCOUNT_LOCKED' | 'SERVER_ERROR';
  lockedUntil?: string; // ISO timestamp for lockout expiry
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
  mustChangePassword: boolean;
}

export interface SessionData {
  userId: string;
  role: UserRole;
  email: string;
  mustChangePassword: boolean; // ADR 0002: Include in session for middleware check
  loginTime: string;
  [key: string]: any;
}

// ADR 0002: Change password request
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ChangePasswordResponse {
  success: boolean;
  message: string;
}

// ADR 0002: Admin user provisioning
export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
}

export interface CreateUserResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    role: UserRole;
    mustChangePassword: boolean;
  };
}