export type UserRole = 'STUDENT' | 'OWNER' | 'ADMIN';
export type BoardingStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';
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

interface ApiSuccess<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
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
  headers.set('Content-Type', 'application/json');
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const payload = (await response.json()) as ApiSuccess<T> | ApiError;

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

  async getOpenMarketplaceReports(): Promise<{ reports: MarketplaceReport[] }> {
    return request<{ reports: MarketplaceReport[] }>('/marketplace/reports/open');
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
