import axios from 'axios';
import { router } from 'expo-router';
import { API_URL } from './constants';
import logger, { sanitize } from './logger';
import { storage } from './storage';
import type { UniStayApiResponse } from '@/types/api.types';
import type { RefreshResponse } from '@/types/auth.types';
import type { InternalAxiosRequestConfig } from 'axios';

/** Extend the axios request config to carry a start-time stamp for latency tracking. */
type TimestampedConfig = InternalAxiosRequestConfig & { _requestStartTime?: number };

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

export async function uploadMyProfileImage(uri: string): Promise<string> {
  logger.api.debug('uploadMyProfileImage');

  const filename = uri.split('/').pop()?.split('?')[0] ?? 'profile.jpg';
  const ext = filename.split('.').pop()?.toLowerCase() ?? 'jpg';
  const type =
    ext === 'png'
      ? 'image/png'
      : ext === 'webp'
        ? 'image/webp'
        : ext === 'heic'
          ? 'image/heic'
          : ext === 'heif'
            ? 'image/heif'
            : 'image/jpeg';

  const formData = new FormData();
  formData.append('profileImage', { uri, name: filename, type } as unknown as Blob);

  const response = await api.put<UniStayApiResponse<{ profileImageUrl: string }>>(
    '/users/me/profile-image',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );

  return response.data.data.profileImageUrl;
}

// ── Logging interceptor – request ──────────────────────────────────────────────
api.interceptors.request.use(
  (config) => {
    (config as TimestampedConfig)._requestStartTime = Date.now();
    const method = (config.method ?? 'GET').toUpperCase();
    const url = config.url ?? '';
    const payload: Record<string, unknown> = {};
    if (config.params) payload.params = sanitize(config.params) as Record<string, unknown>;
    if (config.data && typeof config.data === 'object' && !(config.data instanceof FormData)) {
      payload.body = sanitize(config.data) as Record<string, unknown>;
    } else if (config.data instanceof FormData) {
      payload.body = '[FormData]';
    }
    logger.api.debug(`→ ${method} ${url}`, payload);
    return config;
  },
  (error) => {
    logger.api.error('Request setup error', { message: (error as Error)?.message });
    return Promise.reject(error);
  }
);

// ── Logging interceptor – response (success) ───────────────────────────────────
api.interceptors.response.use(
  (response) => {
    const config = response.config as TimestampedConfig;
    const duration = config._requestStartTime ? Date.now() - config._requestStartTime : undefined;
    const method = (config.method ?? 'GET').toUpperCase();
    const url = config.url ?? '';
    const { data } = response;
    const summary: Record<string, unknown> = { status: response.status };
    if (duration !== undefined) summary.durationMs = duration;
    if (data && typeof data === 'object') {
      const { success, message } = data as { success?: unknown; message?: unknown };
      if (success !== undefined) summary.success = success;
      if (message !== undefined) summary.message = message;
    }
    logger.api.debug(`← ${method} ${url}`, summary);
    return response;
  },
  (error) => error // errors handled in the auth interceptor below
);

// ── Auth interceptor – request (attach token) ──────────────────────────────────
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let refreshSubscribers: Array<(token: string) => void> = [];

function onRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as TimestampedConfig & { _retry?: boolean };
    const method = (originalRequest?.method ?? 'GET').toUpperCase();
    const url = originalRequest?.url ?? '';
    const status: number | undefined = error.response?.status;

    const isRefreshEndpoint = (originalRequest.url as string | undefined)?.includes(
      '/auth/refresh'
    );

    if (status === 401 && !originalRequest._retry && !isRefreshEndpoint) {
      logger.api.info(`Token expired for ${method} ${url} – attempting token refresh`);

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshSubscribers.push((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            resolve(api(originalRequest));
          });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = await storage.getRefreshToken();
        if (!refreshToken) throw new Error('No refresh token');

        const response = await api.post<UniStayApiResponse<RefreshResponse>>('/auth/refresh', {
          refreshToken,
        });
        const { accessToken, refreshToken: newRefreshToken } = response.data.data;

        await storage.setToken(accessToken);
        await storage.setRefreshToken(newRefreshToken);

        logger.api.info(`Token refresh succeeded – retrying ${method} ${url}`);
        onRefreshed(accessToken);
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch {
        logger.api.warn('Token refresh failed – clearing session and redirecting to login');
        await storage.clear();
        router.replace('/(auth)/login');
        return Promise.reject(error);
      } finally {
        isRefreshing = false;
      }
    }

    // Log the error response
    const duration = originalRequest?._requestStartTime
      ? Date.now() - originalRequest._requestStartTime
      : undefined;
    const errorData = error.response?.data as
      | { error?: string; message?: string; details?: unknown[] }
      | undefined;
    logger.api.error(`✗ ${method} ${url}`, {
      status: status ?? 'NETWORK_ERROR',
      ...(duration !== undefined && { durationMs: duration }),
      ...(errorData?.message && { message: errorData.message }),
      ...(errorData?.error && { error: errorData.error }),
      ...(errorData?.details?.length && { details: errorData.details }),
    });

    return Promise.reject(error);
  }
);

export default api;
