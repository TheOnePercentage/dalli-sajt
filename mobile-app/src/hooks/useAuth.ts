import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const {
    user,
    token,
    refreshToken,
    isAuthenticated,
    isLoading,
    biometricEnabled,
    login,
    register,
    logout,
    refreshAuth,
    enableBiometric,
    disableBiometric,
    updateProfile,
  } = useAuthStore();

  return {
    user,
    token,
    refreshToken,
    isAuthenticated,
    isLoading,
    biometricEnabled,
    login,
    register,
    logout,
    refreshAuth,
    enableBiometric,
    disableBiometric,
    updateProfile,
  };
};