import { create } from 'zustand';
import { api } from '@/lib/api-client';
import { isAuthenticated, clearAuthFlag } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  userId: string;
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  userType: 'STAFF' | 'CLIENT';
  staffRole?: string;
  employeeId?: string;
  orgId?: string;
  orgUserRole?: string;
}

interface LoginResponse {
  expiresIn: number;
  user: AuthenticatedUser;
}

interface RegisterPayload {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: string;
  firmSlug: string;
  role?: string;
  orgName?: string;
}

export interface AuthState {
  /** The currently authenticated user, or `null` when logged out. */
  user: AuthenticatedUser | null;
  /** Convenience flag derived from `user !== null`. */
  isAuthenticated: boolean;
  /** `true` while the initial token verification is in-flight. */
  isLoading: boolean;

  /** Authenticate with email / password credentials. */
  login: (email: string, password: string) => Promise<void>;
  /** Create a new account. Does NOT auto-login -- the caller should redirect to login. */
  register: (data: RegisterPayload) => Promise<void>;
  /** End the current session and clear stored tokens. */
  logout: () => Promise<void>;
  /** Bootstrap: verify the stored token on app start and hydrate user data. */
  initialize: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // -------------------------------------------------------------------------
  // login
  // -------------------------------------------------------------------------
  login: async (email: string, password: string) => {
    const data = await api.post<LoginResponse>('/auth/login', {
      email,
      password,
    });

    // Tokens are set by the server via Set-Cookie headers — no localStorage.
    set({ user: data.user, isAuthenticated: true });
  },

  // -------------------------------------------------------------------------
  // register
  // -------------------------------------------------------------------------
  register: async (registerData: RegisterPayload) => {
    await api.post('/auth/register', registerData);
    // Do NOT auto-login -- the user should be redirected to the login page.
  },

  // -------------------------------------------------------------------------
  // logout
  // -------------------------------------------------------------------------
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Best-effort: even if the server call fails we still clear local state.
    }

    clearAuthFlag();
    set({ user: null, isAuthenticated: false });
  },

  // -------------------------------------------------------------------------
  // initialize
  // -------------------------------------------------------------------------
  initialize: async () => {
    if (!isAuthenticated()) {
      set({ isLoading: false });
      return;
    }

    try {
      const user = await api.get<AuthenticatedUser>('/auth/me');
      set({ user, isAuthenticated: true, isLoading: false });
    } catch {
      clearAuthFlag();
      set({ isLoading: false });
    }
  },
}));
