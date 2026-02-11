'use client';

import { useEffect, useRef } from 'react';
import { QueryClientProvider, QueryClient, useQueryClient } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { createQueryClient } from '@/lib/query-client';
import { useAuthStore } from '@/stores/auth-store';
import { getSocket, disconnectAll } from '@/lib/socket';
import { notificationKeys } from '@/hooks/use-notifications';

// ---------------------------------------------------------------------------
// AuthInitializer
// ---------------------------------------------------------------------------

function AuthInitializer() {
  const initialize = useAuthStore((state) => state.initialize);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!initializedRef.current) {
      initializedRef.current = true;
      initialize();
    }
  }, [initialize]);

  return null;
}

// ---------------------------------------------------------------------------
// SocketInitializer
// ---------------------------------------------------------------------------

/**
 * Connects to the /notifications WebSocket namespace when the user is
 * authenticated and invalidates React Query caches when new notifications
 * arrive in real time.
 */
function SocketInitializer() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const queryClient = useQueryClient();
  const connectedRef = useRef(false);

  useEffect(() => {
    if (isAuthenticated && !connectedRef.current) {
      const socket = getSocket('/notifications');

      socket.on('notification', () => {
        queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      });

      socket.connect();
      connectedRef.current = true;
    }

    if (!isAuthenticated && connectedRef.current) {
      disconnectAll();
      connectedRef.current = false;
    }
  }, [isAuthenticated, queryClient]);

  return null;
}

// ---------------------------------------------------------------------------
// AppProviders
// ---------------------------------------------------------------------------

interface AppProvidersProps {
  children: React.ReactNode;
}

/**
 * Top-level client provider tree.
 *
 * Wraps the application with:
 * - **React Query** -- data-fetching cache & deduplication.
 * - **next-themes** -- dark / light / system theme support.
 * - **AuthInitializer** -- session bootstrap on mount.
 *
 * The `QueryClient` instance is kept in a `useRef` so it survives re-renders
 * without being re-created (important for preserving cache between navigations).
 */
export function AppProviders({ children }: AppProvidersProps) {
  const queryClientRef = useRef<QueryClient | null>(null);

  if (!queryClientRef.current) {
    queryClientRef.current = createQueryClient();
  }

  return (
    <QueryClientProvider client={queryClientRef.current}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <AuthInitializer />
        <SocketInitializer />
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}
