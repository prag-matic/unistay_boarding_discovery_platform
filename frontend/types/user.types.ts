export type UserRole = 'STUDENT' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  username?: string;
  profileImageUrl?: string;
  phone?: string;
  university?: string;
  nicNumber?: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  lastName?: string;
  phone?: string;
  university?: string;
  nicNumber?: string;
}
