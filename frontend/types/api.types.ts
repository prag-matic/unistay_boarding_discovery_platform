export interface UniStayApiResponse<T> {
  success: true;
  message: string;
  data: T;
  timestamp: string;
}

export interface UniStayApiError {
  success: false;
  error: string;
  message: string;
  details: Array<{ field?: string; message: string }>;
  timestamp: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
  statusCode?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}
