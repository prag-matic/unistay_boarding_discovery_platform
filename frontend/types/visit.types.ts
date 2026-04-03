export type VisitStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';

export interface VisitBoardingInfo {
  id: string;
  title: string;
  address: string;
  city: string;
  slug: string;
}

export interface VisitStudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface VisitRequest {
  id: string;
  boardingId: string;
  studentId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  message: string | null;
  status: VisitStatus;
  rejectionReason: string | null;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  boarding: VisitBoardingInfo;
  student?: VisitStudentInfo;
}

export interface CreateVisitRequestPayload {
  boardingId: string;
  requestedStartAt: string;
  requestedEndAt: string;
  message?: string;
}

export interface RejectVisitPayload {
  reason: string;
}

