export type ReservationStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED'
  | 'EXPIRED';

export type RentalPeriodStatus = 'UPCOMING' | 'DUE' | 'PARTIALLY_PAID' | 'PAID' | 'OVERDUE';

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'ONLINE';

export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

export interface Payment {
  id: string;
  /** Prisma Decimal serialised as string */
  amount: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  paidAt: string | null;
  referenceNumber: string | null;
  proofImageUrl: string | null;
  rejectionReason: string | null;
  confirmedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReservationBoardingInfo {
  id: string;
  title: string;
  slug: string;
  city: string;
  district: string;
  /** Present on some endpoints (e.g. my-boardings) but not guaranteed by all. */
  address?: string;
}

export interface ReservationStudentInfo {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  university?: string;
}

export interface RentalPeriod {
  id: string;
  reservationId: string;
  /** e.g. "2026-04" */
  periodLabel: string;
  dueDate: string;
  amountDue: number;
  status: RentalPeriodStatus;
  createdAt: string;
  updatedAt: string;
  payments: Payment[];
}

export interface Reservation {
  id: string;
  boardingId: string;
  studentId: string;
  moveInDate: string;
  specialRequests?: string | null;
  status: ReservationStatus;
  /** Rent amount captured at reservation creation time. Use this for price display. */
  rentSnapshot: number;
  /** Full boarding data captured at reservation creation time. */
  boardingSnapshot: Record<string, unknown>;
  rejectionReason: string | null;
  /** ISO datetime when a PENDING reservation auto-expires (72 hours after creation). */
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
  boarding: ReservationBoardingInfo;
  student?: ReservationStudentInfo;
  rentalPeriods?: RentalPeriod[];
}

export interface CreateReservationPayload {
  boardingId: string;
  moveInDate: string;
  specialRequests?: string;
}

export interface RejectReservationPayload {
  reason: string;
}

