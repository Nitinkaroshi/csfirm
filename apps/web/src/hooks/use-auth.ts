import { useAuthStore } from '@/stores/auth-store';

/**
 * Convenience hook that exposes the full auth store.
 *
 * Usage:
 * ```tsx
 * const { user, isAuthenticated, isLoading, login, logout } = useAuth();
 * ```
 */
export const useAuth = () => useAuthStore();
