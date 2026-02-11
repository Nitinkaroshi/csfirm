import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  firmId: string;
  title: string;
  body: string;
  eventType: string;
  isRead: boolean;
  readAt: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface PaginatedNotifications {
  data: Notification[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    unreadCount: number;
  };
}

// ---------------------------------------------------------------------------
// Query Keys
// ---------------------------------------------------------------------------

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: NotificationParams) => ['notifications', params] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,
};

// ---------------------------------------------------------------------------
// Params
// ---------------------------------------------------------------------------

interface NotificationParams {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch a paginated list of notifications for the current user.
 */
export function useNotifications(params?: NotificationParams) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: () =>
      api.get<PaginatedNotifications>('/notifications', {
        page: params?.page,
        limit: params?.limit,
        unreadOnly: params?.unreadOnly,
      }),
  });
}

/**
 * Fetch only the unread notification count. Uses a lightweight endpoint that
 * returns just `{ count: number }`. Falls back to fetching the first page of
 * unread notifications and reading the total from `meta` if the dedicated
 * endpoint is not available.
 */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      try {
        const result = await api.get<{ count: number }>('/notifications/unread-count');
        return result.count;
      } catch {
        // Fallback: fetch page 1 of unread only and use meta.total
        const result = await api.get<PaginatedNotifications>('/notifications', {
          page: 1,
          limit: 1,
          unreadOnly: true,
        });
        return result.meta.total;
      }
    },
    // Poll every 30 seconds for real-time-ish unread badge
    refetchInterval: 30_000,
  });
}

/**
 * Mark a single notification as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.patch(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mark all notifications as read for the current user.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => api.patch('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
