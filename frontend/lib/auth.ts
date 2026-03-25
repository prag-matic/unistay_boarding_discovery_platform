import api from './api';
import { storage } from './storage';
import type { User } from '@/types/user.types';
import type { UniStayApiResponse } from '@/types/api.types';
import type { RefreshResponse } from '@/types/auth.types';

export async function validateToken(): Promise<User | null> {
  try {
    const refreshToken = await storage.getRefreshToken();
    if (!refreshToken) return null;
    const response = await api.post<UniStayApiResponse<RefreshResponse>>('/auth/refresh', {
      refreshToken,
    });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    await storage.setToken(accessToken);
    await storage.setRefreshToken(newRefreshToken);
    return await storage.getUser<User>();
  } catch {
    return null;
  }
}

export async function getAuthHeaders() {
  const token = await storage.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
