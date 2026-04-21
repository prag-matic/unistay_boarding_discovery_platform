import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api, type AuthUser } from '../services/api';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(api.getStoredAuthUser());

  useEffect(() => {
    if (!api.hasStoredAccessToken()) {
      api.clearSession();
      setUser(null);
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: api.hasStoredAccessToken(),
      login: async (email: string, password: string) => {
        const response = await api.login(email, password);
        setUser(response.user);
      },
      logout: async () => {
        await api.logout();
        setUser(null);
      },
      refreshUser: async () => {
        const nextUser = await api.getMe();
        setUser(nextUser);
      },
      setUser: (nextUser: AuthUser | null) => {
        setUser(nextUser);
      },
    }),
    [user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
}
