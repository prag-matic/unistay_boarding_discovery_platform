import type { User } from './user.types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterStudentRequest {
  firstName: string;
  lastName: string;
  email: string;
  university: string;
  password: string;
  confirmPassword: string;
  role: 'student';
}

export interface RegisterOwnerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  nicNumber?: string;
  password: string;
  confirmPassword: string;
  role: 'owner';
}

export type RegisterData = RegisterStudentRequest | RegisterOwnerRequest;

/** Shape returned by POST /auth/login */
export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: User;
}

/** Shape returned by POST /auth/refresh */
export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

/** Legacy alias kept for backwards compatibility */
export interface AuthResponse {
  token: string;
  user: User;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}
