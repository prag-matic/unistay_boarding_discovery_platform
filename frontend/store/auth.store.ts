import { create } from 'zustand';
import api from '@/lib/api';
import { storage } from '@/lib/storage';
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
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
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
    set({ isLoading: true });
    try {
      const response = await api.put<UniStayApiResponse<{ user: User }>>('/users/me', data);
      const updatedUser = response.data.data.user;
      await storage.setUser(updatedUser);
      set({ user: updatedUser });
    } finally {
      set({ isLoading: false });
    }
  },

  checkAuth: async () => {
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
