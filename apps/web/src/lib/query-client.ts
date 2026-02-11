import { QueryClient } from '@tanstack/react-query';

/**
 * Factory for creating a pre-configured React Query `QueryClient`.
 *
 * Call this once at the provider level (ideally via a `useRef` to keep a
 * stable reference across re-renders in a client component).
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /** Consider data fresh for 2 minutes before background refetch. */
        staleTime: 2 * 60 * 1000,
        /** Keep unused cache entries for 10 minutes. */
        gcTime: 10 * 60 * 1000,
        /** Retry failed queries once before surfacing the error. */
        retry: 1,
        /** Disable automatic refetch when the browser window regains focus. */
        refetchOnWindowFocus: false,
        /** Disable automatic refetch on network reconnect. */
        refetchOnReconnect: false,
      },
    },
  });
}
