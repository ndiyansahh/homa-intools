export type UserRole = 'ADMIN' | 'OWNER' | 'STAFF';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  userId: string;
  role: UserRole;
}

export interface LoginError {
  error: 'INVALID_CREDENTIALS' | 'RATE_LIMITED' | 'SERVER_ERROR';
}

export interface User {
  id: string;
  email: string;
  role: UserRole;
}

export interface SessionData {
  userId: string;
  role: UserRole;
  email: string;
  loginTime: string;
  [key: string]: any;
}