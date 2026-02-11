import { API_BASE_URL } from '@/lib/constants';

// ---------------------------------------------------------------------------
// Cookie-based Auth Helpers
// ---------------------------------------------------------------------------
// Tokens are stored in HTTP-only cookies set by the server.
// JavaScript cannot (and should not) read them directly.
// The only client-readable cookie is the lightweight `csfirm_authenticated`
// flag, used to detect session presence in frontend JS and Next.js middleware.
// ---------------------------------------------------------------------------

const AUTH_COOKIE_NAME = 'csfirm_authenticated';

/**
 * Check whether the user appears to have an active session by reading the
 * non-httpOnly `csfirm_authenticated` flag cookie.
 */
export function isAuthenticated(): boolean {
  if (typeof document === 'undefined') return false;
  return document.cookie.split(';').some((c) => c.trim().startsWith(`${AUTH_COOKIE_NAME}=`));
}

/**
 * Clear the client-readable auth flag cookie.
 * The actual httpOnly token cookies can only be cleared by the server.
 */
export function clearAuthFlag(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${AUTH_COOKIE_NAME}=; path=/; max-age=0`;
}

// ---------------------------------------------------------------------------
// Legacy stubs — keeps existing `if (getAccessToken())` checks working
// without a full codebase refactor.
// ---------------------------------------------------------------------------

/**
 * @deprecated Tokens are now in HTTP-only cookies. Use `isAuthenticated()`.
 * Returns a sentinel string when authenticated so existing truthy checks pass.
 */
export function getAccessToken(): string | null {
  return isAuthenticated() ? '__http_only_cookie__' : null;
}

/** @deprecated No-op. Tokens are set by the server via Set-Cookie headers. */
export function setTokens(_accessToken: string, _refreshToken: string): void {
  // No-op — server sets cookies directly
}

/** @deprecated Use `clearAuthFlag()`. */
export function clearTokens(): void {
  clearAuthFlag();
}

// ---------------------------------------------------------------------------
// Token Refresh
// ---------------------------------------------------------------------------

let refreshPromise: Promise<boolean> | null = null;

/**
 * Attempt to obtain a fresh access/refresh token pair from the backend.
 *
 * The browser sends the refresh token cookie automatically. On success the
 * server responds with new Set-Cookie headers. On failure we clear the auth
 * flag and return `false`.
 */
export async function refreshTokens(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = _performRefresh();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function _performRefresh(): Promise<boolean> {
  if (!isAuthenticated()) {
    clearAuthFlag();
    return false;
  }

  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      clearAuthFlag();
      return false;
    }

    // Server sets new cookies via Set-Cookie headers — nothing to store.
    return true;
  } catch {
    clearAuthFlag();
    return false;
  }
}
