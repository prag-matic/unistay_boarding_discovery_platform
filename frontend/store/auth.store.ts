import { create } from 'zustand';
import api from '@/lib/api';
import { storage } from '@/lib/storage';
import type { User } from '@/types/user.types';
import type { RegisterData, LoginResponse, RefreshResponse } from '@/types/auth.types';
import type { UniStayApiResponse } from '@/types/api.types';
import { getCurrentUserProfile, updateCurrentUserProfile } from '@/lib/user';
import type { UpdateProfileRequest } from '@/types/user.types';

const mergeUserData = (preferred: User, fallback: User | null): User => ({
  ...fallback,
  ...preferred,
  profileImageUrl:
    preferred.profileImageUrl ?? fallback?.profileImageUrl ?? null,
  phone: preferred.phone ?? fallback?.phone,
  university: preferred.university ?? fallback?.university,
}) as User;

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
  updateProfile: (data: UpdateProfileRequest) => Promise<void>;
  refreshProfile: () => Promise<void>;
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
      const { accessToken, refreshToken, user: loginUser } = response.data.data;
      await storage.setToken(accessToken);
      await storage.setRefreshToken(refreshToken);
      const meUser = await getCurrentUserProfile();
      const mergedUser = mergeUserData(meUser, loginUser);
      await storage.setUser(mergedUser);
      set({ token: accessToken, refreshToken, user: mergedUser, isAuthenticated: true });
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
      const currentUser = get().user;
      const updatedUser = await updateCurrentUserProfile(data);
      const mergedUser = mergeUserData(updatedUser, currentUser);
      await storage.setUser(mergedUser);
      set({ user: mergedUser });
    } finally {
      set({ isLoading: false });
    }
  },

  refreshProfile: async () => {
    const currentUser = get().user;
    const user = await getCurrentUserProfile();
    const mergedUser = mergeUserData(user, currentUser);
    await storage.setUser(mergedUser);
    set({ user: mergedUser });
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
      const user = await getCurrentUserProfile();
      const storedUser = await storage.getUser<User>();
      const mergedUser = mergeUserData(user, storedUser);
      await storage.setUser(mergedUser);
      set({
        token: accessToken,
        refreshToken: newRefreshToken,
        user: mergedUser,
        isAuthenticated: true,
      });
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
      try {
        const freshUser = await getCurrentUserProfile();
        const mergedUser = mergeUserData(freshUser, user);
        await storage.setUser(mergedUser);
        set({ token, refreshToken, user: mergedUser, isAuthenticated: true });
      } catch {
        set({ token, refreshToken, user, isAuthenticated: true });
      }
    }
  },
}));
