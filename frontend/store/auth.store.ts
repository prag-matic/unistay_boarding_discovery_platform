import { create } from 'zustand';
import api, { uploadMyProfileImage } from '@/lib/api';
import logger from '@/lib/logger';
import { storage } from '@/lib/storage';
import { getErrorMessage } from '@/utils/helpers';
import type { User } from '@/types/user.types';
import type { RegisterData, LoginResponse, RefreshResponse } from '@/types/auth.types';
import type { UniStayApiResponse } from '@/types/api.types';

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  selectedRole: 'student' | 'owner' | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  setSelectedRole: (role: 'student' | 'owner') => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
  checkAuth: () => Promise<boolean>;
  hydrate: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  selectedRole: null,

  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setSelectedRole: (role) => set({ selectedRole: role }),

  login: async (email, password) => {
    logger.store.debug('login', { email });
    set({ isLoading: true });
    try {
      const response = await api.post<UniStayApiResponse<LoginResponse>>('/auth/login', {
        email,
        password,
      });
      const { accessToken, refreshToken, user } = response.data.data;
      await storage.setToken(accessToken);
      await storage.setRefreshToken(refreshToken);
      await storage.setUser(user);
      set({ token: accessToken, refreshToken, user, isAuthenticated: true });
    } catch (error) {
      throw new Error(getErrorMessage(error));
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    logger.store.debug('register', { email: data.email, role: data.role });
    set({ isLoading: true });
    try {
      const apiRole = data.role === 'student' ? 'STUDENT' : 'OWNER';
      // Strip UI-only fields before sending to API
      const { confirmPassword: _confirmPassword, ...rest } = data as RegisterData & {
        confirmPassword?: string;
        terms?: boolean;
      };
      const { terms: _terms, ...payload } = rest as typeof rest & { terms?: boolean };
      await api.post('/auth/register', { ...payload, role: apiRole });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    logger.store.debug('logout');
    const refreshToken = get().refreshToken ?? (await storage.getRefreshToken());
    if (refreshToken) {
      try {
        await api.post('/auth/logout', { refreshToken });
      } catch {
        // best-effort: ignore errors so local state is always cleared
      }
    }
    await storage.clear();
    set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
  },

  updateProfile: async (data) => {
    logger.store.debug('updateProfile');
    set({ isLoading: true });
    try {
      const { profileImageUrl, ...profilePayload } = data;
      const response = await api.put<UniStayApiResponse<User>>('/users/me', profilePayload);
      const updatedUser = response.data.data;

      if (profileImageUrl && !/^https?:\/\//i.test(profileImageUrl)) {
        const uploadedImageUrl = await uploadMyProfileImage(profileImageUrl);
        updatedUser.profileImageUrl = uploadedImageUrl;
      }

      await storage.setUser(updatedUser);
      set({ user: updatedUser });
    } finally {
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
    logger.store.debug('checkAuth');
    const storedRefreshToken = await storage.getRefreshToken();
    if (!storedRefreshToken) return false;
    try {
      const response = await api.post<UniStayApiResponse<RefreshResponse>>('/auth/refresh', {
        refreshToken: storedRefreshToken,
      });
      const { accessToken, refreshToken: newRefreshToken } = response.data.data;
      await storage.setToken(accessToken);
      await storage.setRefreshToken(newRefreshToken);
      const user = await storage.getUser<User>();
      if (!user) return false;
      set({ token: accessToken, refreshToken: newRefreshToken, user, isAuthenticated: true });
      return true;
    } catch {
      await get().logout();
      return false;
    }
  },

  hydrate: async () => {
    const token = await storage.getToken();
    const refreshToken = await storage.getRefreshToken();
    const user = await storage.getUser<User>();
    if (token && refreshToken && user) {
      set({ token, refreshToken, user, isAuthenticated: true });
    }
  },
}));
