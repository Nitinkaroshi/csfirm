"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/auth-store";

/**
 * Redirects already-authenticated users away from public pages (e.g. login,
 * register) to a protected area of the application.
 *
 * @param redirectTo - The path to redirect to when the user is authenticated.
 *                     Defaults to `/dashboard`.
 * @returns An object containing `isLoading` so the calling component can
 *          render a loading state while the auth check is in progress.
 */
export function useRedirectAuthenticated(redirectTo = "/dashboard") {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirectTo);
    }
  }, [isAuthenticated, isLoading, router, redirectTo]);

  return { isLoading };
}
