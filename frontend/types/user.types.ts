export type UserRole = 'STUDENT' | 'OWNER' | 'ADMIN';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  username?: string;
  profileImageUrl?: string | null;
  phone?: string;
  university?: string;
  nicNumber?: string;
  studyYear?: number;
  degree?: string;
  gender?: string;
  dateOfBirth?: string;
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
  studyYear?: number;
  degree?: string;
  role?: Extract<UserRole, 'STUDENT' | 'OWNER'>;
  email?: string;
  gender?: string;
  dateOfBirth?: string;
}
