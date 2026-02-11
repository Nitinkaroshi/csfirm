import { API_BASE_URL } from '@/lib/constants';
import { refreshTokens, clearAuthFlag } from '@/lib/auth';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Standard envelope returned by the CSFIRM API. */
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

/** Any record whose values are primitives suitable for query strings. */
type QueryParams = Record<string, string | number | boolean | undefined | null>;

// ---------------------------------------------------------------------------
// ApiClient
// ---------------------------------------------------------------------------

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  /**
   * Build request headers. Auth is handled by HTTP-only cookies sent
   * automatically by the browser — no Authorization header needed.
   */
  private getHeaders(): HeadersInit {
    return { 'Content-Type': 'application/json' };
  }

  /**
   * Parse the JSON body and unwrap the standard API envelope.
   *
   * Throws a descriptive error when `success` is `false` or the response
   * status indicates a failure.
   */
  private async handleResponse<T>(response: Response): Promise<T> {
    // Handle 204 No Content (common for DELETE)
    if (response.status === 204) {
      return undefined as unknown as T;
    }

    let json: ApiResponse<T>;

    try {
      json = await response.json();
    } catch {
      throw new Error(
        `API request failed with status ${response.status}: unable to parse response body`,
      );
    }

    if (!response.ok || !json.success) {
      const message =
        json.error || json.message || `Request failed with status ${response.status}`;
      const error = new Error(message) as Error & { status: number };
      error.status = response.status;
      throw error;
    }

    return json.data;
  }

  /**
   * Core request method. Handles 401 token-refresh retry logic.
   *
   * On a 401 response the client will:
   *   1. Attempt a token refresh via `refreshTokens()`.
   *   2. If refresh succeeds, **retry the original request once** with the new
   *      token.
   *   3. If refresh fails, clear stored tokens and redirect the user to the
   *      login page.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    isRetry = false,
    extraHeaders?: Record<string, string>,
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: { ...this.getHeaders(), ...extraHeaders },
      credentials: 'include',
    };

    if (body !== undefined) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // --- 401 Interceptor ---------------------------------------------------
    if (response.status === 401 && !isRetry) {
      const refreshed = await refreshTokens();

      if (refreshed) {
        // Retry with the fresh token
        return this.request<T>(method, path, body, true, extraHeaders);
      }

      // Refresh failed -- force logout
      clearAuthFlag();
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw new Error('Session expired. Please log in again.');
    }

    return this.handleResponse<T>(response);
  }

  // -----------------------------------------------------------------------
  // Query-string builder
  // -----------------------------------------------------------------------

  /**
   * Convert an object into a URL-encoded query string, filtering out
   * `undefined` and `null` values.
   */
  private buildQueryString(params?: QueryParams): string {
    if (!params) return '';

    const entries = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null,
    );

    if (entries.length === 0) return '';

    const searchParams = new URLSearchParams();
    for (const [key, value] of entries) {
      searchParams.append(key, String(value));
    }

    return `?${searchParams.toString()}`;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Perform a GET request. Optional `params` are serialised as query-string
   * parameters (undefined / null values are omitted).
   */
  async get<T = any>(path: string, params?: QueryParams): Promise<T> {
    const qs = this.buildQueryString(params);
    return this.request<T>('GET', `${path}${qs}`);
  }

  /**
   * Perform a POST request with an optional JSON body.
   */
  async post<T = any>(path: string, body?: unknown, opts?: { headers?: Record<string, string> }): Promise<T> {
    return this.request<T>('POST', path, body, false, opts?.headers);
  }

  /**
   * Perform a PATCH request with an optional JSON body.
   */
  async patch<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body);
  }

  /**
   * Perform a DELETE request with an optional JSON body.
   */
  async del<T = any>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('DELETE', path, body);
  }
}

// ---------------------------------------------------------------------------
// Singleton export
// ---------------------------------------------------------------------------

export const api = new ApiClient();

/** Alias used across the app */
export const apiClient = api;
