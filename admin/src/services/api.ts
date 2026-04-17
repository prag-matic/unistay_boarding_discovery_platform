export type UserRole = 'STUDENT' | 'OWNER' | 'ADMIN';
export type BoardingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED' | 'INACTIVE';
export type ReservationStatus = 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'REJECTED' | 'EXPIRED';
export type VisitRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
export type PaymentStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';
export type MarketplaceStatus = 'ACTIVE' | 'TAKEN_DOWN' | 'REMOVED';
export type MarketplaceReportReason =
  | 'SPAM'
  | 'SCAM'
  | 'PROHIBITED_ITEM'
  | 'HARASSMENT'
  | 'OTHER';
export type MarketplaceReportStatus = 'OPEN' | 'RESOLVED' | 'DISMISSED';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isVerified: boolean;
  isActive: boolean;
  phone?: string;
  university?: string;
  nicNumber?: string;
  profileImageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

export interface Pagination {
  total: number;
  page: number;
  size: number;
  totalPages: number;
}

export interface Boarding {
  id: string;
  title: string;
  city: string;
  district: string;
  address?: string;
  monthlyRent: number;
  boardingType: string;
  genderPref: string;
  maxOccupants: number;
  currentOccupants: number;
  status: BoardingStatus;
  description: string;
  rejectionReason?: string;
  updatedAt: string;
  ownerId: string;
  owner?: {
    id: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  amenities?: Array<{ id: string; name: string }>;
  rules?: Array<{ id: string; rule: string }>;
  images?: Array<{ id: string; url: string }>;
}

export interface MarketplaceSeller {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface MarketplaceItem {
  id: string;
  sellerId: string;
  seller?: MarketplaceSeller;
  title: string;
  description: string;
  adType: 'SELL' | 'GIVEAWAY';
  category: string;
  itemCondition: 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
  price?: number;
  city: string;
  district: string;
  status: MarketplaceStatus;
  takedownReason?: string;
  reportCount: number;
  images?: Array<{
    id: string;
    url: string;
    publicId?: string;
    createdAt?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

export interface MarketplaceReport {
  id: string;
  itemId: MarketplaceItem;
  reporterId:
    | string
    | {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
  reason: MarketplaceReportReason;
  details?: string;
  status: MarketplaceReportStatus;
  createdAt: string;
  updatedAt: string;
}

export interface AdminReservation {
  id: string;
  status: ReservationStatus;
  moveInDate: string;
  specialRequests?: string;
  rentSnapshot: number;
  expiresAt: string;
  createdAt: string;
  studentId: string;
  boardingId: string;
  student?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  boarding?: {
    id: string;
    title?: string;
    slug?: string;
    city?: string;
    district?: string;
  };
}

export interface AdminVisitRequest {
  id: string;
  status: VisitRequestStatus;
  requestedStartAt: string;
  requestedEndAt: string;
  message?: string;
  rejectionReason?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  studentId: string;
  boardingId: string;
  student?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  boarding?: {
    id: string;
    title?: string;
    slug?: string;
    city?: string;
    district?: string;
  };
}

export interface AdminPayment {
  id: string;
  reservationId: string;
  rentalPeriodId: string;
  studentId: string;
  amount: number;
  paymentMethod: 'CASH' | 'BANK_TRANSFER' | 'ONLINE';
  referenceNumber?: string;
  proofImageUrl?: string;
  status: PaymentStatus;
  paidAt: string;
  rejectionReason?: string;
  confirmedAt?: string;
  createdAt: string;
  reservation?: {
    id: string;
    boarding?: {
      id: string;
      title?: string;
    };
  };
  rentalPeriod?: {
    id: string;
    periodLabel?: string;
    dueDate?: string;
    amountDue?: number;
    status?: string;
  };
}

export interface AdminReview {
  id: string;
  rating: number;
  comment?: string;
  createdAt: string;
  studentId:
    | string
    | {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
      };
  boardingId:
    | string
    | {
        id: string;
        title?: string;
        slug?: string;
        city?: string;
        district?: string;
      };
}

export interface AdminDashboardKpis {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  moderation: {
    pendingBoardings: number;
    openMarketplaceReports: number;
    pendingReservations: number;
    pendingVisitRequests: number;
    pendingPayments: number;
    totalReviews: number;
  };
}

export interface AdminActionLog {
  id: string;
  action: string;
  targetType: 'USER' | 'BOARDING' | 'PAYMENT' | 'REVIEW' | 'SYSTEM';
  targetIds: string[];
  metadata?: Record<string, unknown>;
  createdAt: string;
  adminId:
    | string
    | {
        id: string;
        firstName?: string;
        lastName?: string;
        email?: string;
        role?: string;
      };
}

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

interface UpdateMePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  university?: string;
  nicNumber?: string;
}

interface ApiError {
  success: false;
  error: string;
  message: string;
  details?: unknown;
  timestamp: string;
}

export interface ApiClientError extends Error {
  status: number;
  code: string;
  details?: unknown;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/+$/, '') ||
  '/api';

const ACCESS_TOKEN_KEY = 'admin.accessToken';
const REFRESH_TOKEN_KEY = 'admin.refreshToken';
const USER_KEY = 'admin.user';

let accessToken: string | null = localStorage.getItem(ACCESS_TOKEN_KEY);

function toApiError(status: number, payload: ApiError | null): ApiClientError {
  const error = new Error(payload?.message || 'Request failed') as ApiClientError;
  error.status = status;
  error.code = payload?.error || 'RequestError';
  error.details = payload?.details;
  return error;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  headers.set('Accept', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const rawBody = await response.text();

  if (!rawBody) {
    if (response.ok) {
      return undefined as T;
    }
    throw toApiError(response.status, {
      success: false,
      error: 'EmptyResponse',
      message: 'Server returned an empty response',
      timestamp: new Date().toISOString(),
    });
  }

  let payload: ApiSuccess<T> | ApiError;
  try {
    payload = JSON.parse(rawBody) as ApiSuccess<T> | ApiError;
  } catch {
    throw toApiError(response.status, {
      success: false,
      error: 'InvalidJsonResponse',
      message: 'Server returned an invalid JSON response',
      details: rawBody.slice(0, 500),
      timestamp: new Date().toISOString(),
    });
  }

  if (!response.ok || !payload.success) {
    throw toApiError(response.status, (payload as ApiError) ?? null);
  }

  return (payload as ApiSuccess<T>).data;
}

function setAuthSession(data: LoginResponse): void {
  accessToken = data.accessToken;
  localStorage.setItem(ACCESS_TOKEN_KEY, data.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

function setStoredAuthUser(user: AuthUser): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearAuthSession(): void {
  accessToken = null;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredAuthUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function hasStoredAccessToken(): boolean {
  return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
}

export const api = {
  getStoredAuthUser,
  hasStoredAccessToken,

  async login(email: string, password: string): Promise<LoginResponse> {
    const data = await request<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthSession(data);
    return data;
  },

  async getMe(): Promise<AuthUser> {
    const user = await request<AuthUser>('/users/me');
    setStoredAuthUser(user);
    return user;
  },

  async updateMe(payload: UpdateMePayload): Promise<AuthUser> {
    const user = await request<AuthUser>('/users/me', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
    setStoredAuthUser(user);
    return user;
  },

  async changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
    await request<null>('/users/me/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async uploadMyProfileImage(file: File): Promise<{ profileImageUrl?: string }> {
    const body = new FormData();
    body.append('profileImage', file);
    const response = await request<{ profileImageUrl?: string }>('/users/me/profile-image', {
      method: 'PUT',
      body,
    });
    const currentUser = getStoredAuthUser();
    if (currentUser && response.profileImageUrl) {
      setStoredAuthUser({
        ...currentUser,
        profileImageUrl: response.profileImageUrl,
      });
    }
    return response;
  },

  async logout(): Promise<void> {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await request('/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
        });
      } catch {
        // Ignore logout API failures and clear local session anyway.
      }
    }

    clearAuthSession();
  },

  clearSession(): void {
    clearAuthSession();
  },

  async getPendingBoardings(): Promise<{ boardings: Boarding[] }> {
    return request<{ boardings: Boarding[] }>('/admin/boardings/pending');
  },

  async getAdminBoardings(params: {
    page: number;
    size: number;
    status?: BoardingStatus;
    search?: string;
  }): Promise<{ boardings: Boarding[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    return request<{ boardings: Boarding[]; pagination: Pagination }>(`/admin/boardings?${query.toString()}`);
  },

  async setBoardingStatusByAdmin(
    id: string,
    status: Extract<BoardingStatus, 'ACTIVE' | 'INACTIVE' | 'REJECTED'>,
    reason?: string,
  ): Promise<{ boarding: Boarding }> {
    return request<{ boarding: Boarding }>(`/admin/boardings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  async approveBoarding(id: string): Promise<{ boarding: Boarding }> {
    return request<{ boarding: Boarding }>(`/admin/boardings/${id}/approve`, {
      method: 'PATCH',
    });
  },

  async rejectBoarding(id: string, reason: string): Promise<{ boarding: Boarding }> {
    return request<{ boarding: Boarding }>(`/admin/boardings/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async getUsers(params: {
    page: number;
    size: number;
    role?: UserRole;
    active?: boolean;
    search?: string;
  }): Promise<{ users: User[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.role) query.set('role', params.role);
    if (params.active !== undefined) query.set('active', String(params.active));
    if (params.search) query.set('search', params.search);

    return request<{ users: User[]; pagination: Pagination }>(`/admin/users?${query.toString()}`);
  },

  async activateUser(id: string): Promise<{ id: string; isActive: boolean }> {
    return request<{ id: string; isActive: boolean }>(`/admin/users/${id}/activate`, {
      method: 'PATCH',
    });
  },

  async deactivateUser(id: string): Promise<{ id: string; isActive: boolean }> {
    return request<{ id: string; isActive: boolean }>(`/admin/users/${id}/deactivate`, {
      method: 'PATCH',
    });
  },

  async getAdminDashboardKpis(): Promise<AdminDashboardKpis> {
    return request<AdminDashboardKpis>('/admin/dashboard/kpis');
  },

  async getReservations(params: {
    page: number;
    size: number;
    status?: ReservationStatus;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{ reservations: AdminReservation[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.createdFrom) query.set('createdFrom', params.createdFrom);
    if (params.createdTo) query.set('createdTo', params.createdTo);

    return request<{ reservations: AdminReservation[]; pagination: Pagination }>(
      `/admin/reservations?${query.toString()}`,
    );
  },

  async getVisitRequests(params: {
    page: number;
    size: number;
    status?: VisitRequestStatus;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{ visitRequests: AdminVisitRequest[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.createdFrom) query.set('createdFrom', params.createdFrom);
    if (params.createdTo) query.set('createdTo', params.createdTo);

    return request<{ visitRequests: AdminVisitRequest[]; pagination: Pagination }>(
      `/admin/visit-requests?${query.toString()}`,
    );
  },

  async getPayments(params: {
    page: number;
    size: number;
    status?: PaymentStatus;
    search?: string;
    minAmount?: number;
    maxAmount?: number;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{ payments: AdminPayment[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.minAmount !== undefined) query.set('minAmount', String(params.minAmount));
    if (params.maxAmount !== undefined) query.set('maxAmount', String(params.maxAmount));
    if (params.createdFrom) query.set('createdFrom', params.createdFrom);
    if (params.createdTo) query.set('createdTo', params.createdTo);

    return request<{ payments: AdminPayment[]; pagination: Pagination }>(
      `/admin/payments?${query.toString()}`,
    );
  },

  async confirmPaymentByAdmin(id: string): Promise<{ payment: AdminPayment }> {
    return request<{ payment: AdminPayment }>(`/admin/payments/${id}/confirm`, {
      method: 'PATCH',
    });
  },

  async rejectPaymentByAdmin(id: string, reason: string): Promise<{ payment: AdminPayment }> {
    return request<{ payment: AdminPayment }>(`/admin/payments/${id}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async confirmPaymentsBulk(paymentIds: string[]): Promise<{ matchedCount: number; modifiedCount: number }> {
    return request<{ matchedCount: number; modifiedCount: number }>('/admin/payments/bulk/confirm', {
      method: 'PATCH',
      body: JSON.stringify({ paymentIds }),
    });
  },

  async rejectPaymentsBulk(
    paymentIds: string[],
    reason: string,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    return request<{ matchedCount: number; modifiedCount: number }>('/admin/payments/bulk/reject', {
      method: 'PATCH',
      body: JSON.stringify({ paymentIds, reason }),
    });
  },

  async getReviews(params: {
    page: number;
    size: number;
    minRating?: number;
    maxRating?: number;
    search?: string;
    createdFrom?: string;
    createdTo?: string;
  }): Promise<{ reviews: AdminReview[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.minRating !== undefined) query.set('minRating', String(params.minRating));
    if (params.maxRating !== undefined) query.set('maxRating', String(params.maxRating));
    if (params.search) query.set('search', params.search);
    if (params.createdFrom) query.set('createdFrom', params.createdFrom);
    if (params.createdTo) query.set('createdTo', params.createdTo);

    return request<{ reviews: AdminReview[]; pagination: Pagination }>(`/admin/reviews?${query.toString()}`);
  },

  async deleteReviewByAdmin(id: string): Promise<void> {
    await request<null>(`/admin/reviews/${id}`, {
      method: 'DELETE',
    });
  },

  async deleteReviewsBulk(reviewIds: string[]): Promise<{ deletedCount: number }> {
    return request<{ deletedCount: number }>('/admin/reviews/bulk', {
      method: 'DELETE',
      body: JSON.stringify({ reviewIds }),
    });
  },

  async setUsersStatusBulk(
    userIds: string[],
    isActive: boolean,
  ): Promise<{ matchedCount: number; modifiedCount: number }> {
    return request<{ matchedCount: number; modifiedCount: number }>('/admin/users/bulk-status', {
      method: 'PATCH',
      body: JSON.stringify({ userIds, isActive }),
    });
  },

  async getAdminActions(params: {
    page: number;
    size: number;
    action?: string;
    targetType?: 'USER' | 'BOARDING' | 'PAYMENT' | 'REVIEW' | 'SYSTEM';
  }): Promise<{ actions: AdminActionLog[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.action) query.set('action', params.action);
    if (params.targetType) query.set('targetType', params.targetType);

    return request<{ actions: AdminActionLog[]; pagination: Pagination }>(`/admin/actions?${query.toString()}`);
  },

  async getOpenMarketplaceReports(): Promise<{ reports: MarketplaceReport[] }> {
    return request<{ reports: MarketplaceReport[] }>('/marketplace/reports/open');
  },

  async getAdminMarketplaceItems(params: {
    page: number;
    size: number;
    status?: MarketplaceStatus;
    search?: string;
  }): Promise<{ items: MarketplaceItem[]; pagination: Pagination }> {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size),
    });

    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);

    return request<{ items: MarketplaceItem[]; pagination: Pagination }>(`/admin/marketplace?${query.toString()}`);
  },

  async setMarketplaceStatusByAdmin(
    id: string,
    status: MarketplaceStatus,
    reason?: string,
  ): Promise<{ item: MarketplaceItem }> {
    return request<{ item: MarketplaceItem }>(`/admin/marketplace/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, reason }),
    });
  },

  async takedownMarketplaceItem(
    id: string,
    reason?: string,
  ): Promise<{ item: MarketplaceItem }> {
    return request<{ item: MarketplaceItem }>(`/marketplace/${id}/takedown`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    });
  },

  async reinstateMarketplaceItem(id: string): Promise<{ item: MarketplaceItem }> {
    return request<{ item: MarketplaceItem }>(`/marketplace/${id}/reinstate`, {
      method: 'PATCH',
    });
  },

  async resolveMarketplaceReport(
    reportId: string,
    status: Exclude<MarketplaceReportStatus, 'OPEN'>,
    notes?: string,
  ): Promise<{ report: MarketplaceReport }> {
    return request<{ report: MarketplaceReport }>(`/marketplace/reports/${reportId}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes }),
    });
  },
};
