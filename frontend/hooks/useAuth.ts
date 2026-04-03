import { useAuthStore } from '@/store/auth.store';

export function useAuth() {
  const {
    user,
    token,
    isAuthenticated,
    isLoading,
    selectedRole,
    login,
    register,
    logout,
    setSelectedRole,
    updateProfile,
    checkAuth,
    hydrate,
  } = useAuthStore();

  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    selectedRole,
    login,
    register,
    logout,
    setSelectedRole,
    updateProfile,
    checkAuth,
    hydrate,
  };
}
