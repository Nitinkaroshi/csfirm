import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware for route protection.
 *
 * Uses a lightweight cookie flag (`csfirm_authenticated`) set by the client
 * to determine whether the user has an active session. This avoids the need
 * for the middleware to inspect JWTs or call any backend service.
 *
 * Routing rules:
 * - Unauthenticated users accessing protected routes are redirected to `/login`.
 * - Authenticated users accessing auth pages (`/login`, `/register`) are
 *   redirected to `/dashboard`.
 * - The root path (`/`) redirects to `/dashboard` (authenticated) or `/login`
 *   (unauthenticated).
 */
export function middleware(request: NextRequest) {
  const isAuthenticated = request.cookies.get('csfirm_authenticated');
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith('/login') || pathname.startsWith('/register');
  const isPublicPath = pathname === '/' || isAuthPage;

  // Unauthenticated user trying to access a protected route
  if (!isAuthenticated && !isPublicPath) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Authenticated user landing on an auth page -- send them to the dashboard
  if (isAuthenticated && isAuthPage) {
    const dashboardUrl = new URL('/dashboard', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  // Root path redirect
  if (pathname === '/') {
    if (isAuthenticated) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *  - _next/static  (static assets)
     *  - _next/image   (image optimisation)
     *  - favicon.ico   (browser icon)
     *  - api           (API routes, if any)
     */
    '/((?!_next/static|_next/image|favicon.ico|api).*)',
  ],
};
