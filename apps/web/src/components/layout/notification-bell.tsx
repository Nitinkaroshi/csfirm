'use client';

import { Bell, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/lib/utils';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
} from '@/hooks/use-notifications';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NotificationBell() {
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data: notificationsData, isLoading } = useNotifications({
    page: 1,
    limit: 5,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = notificationsData?.data ?? [];
  const hasUnread = unreadCount > 0;

  const handleMarkAsRead = (id: string) => {
    markAsRead.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead.mutate();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />

          {/* Unread badge */}
          {hasUnread && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}

          <span className="sr-only">
            Notifications{hasUnread ? ` (${unreadCount} unread)` : ''}
          </span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {hasUnread && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-foreground"
              onClick={handleMarkAllAsRead}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Check className="mr-1 h-3 w-3" />
              )}
              Mark all as read
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        {/* Loading state */}
        {isLoading && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && notifications.length === 0 && (
          <div className="py-6 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        )}

        {/* Notification items */}
        {!isLoading &&
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={cn(
                'flex cursor-pointer flex-col items-start gap-1 p-3',
                !notification.isRead && 'bg-accent/50',
              )}
              onClick={() => {
                if (!notification.isRead) {
                  handleMarkAsRead(notification.id);
                }
              }}
            >
              <div className="flex w-full items-start justify-between gap-2">
                <span
                  className={cn(
                    'text-sm font-medium leading-tight',
                    !notification.isRead && 'text-foreground',
                    notification.isRead && 'text-muted-foreground',
                  )}
                >
                  {notification.title}
                </span>
                {!notification.isRead && (
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                )}
              </div>
              <span className="line-clamp-2 text-xs text-muted-foreground">
                {notification.body}
              </span>
              <span className="text-[11px] text-muted-foreground/70">
                {formatRelativeTime(notification.createdAt)}
              </span>
            </DropdownMenuItem>
          ))}

        {/* Footer */}
        {!isLoading && notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="cursor-pointer justify-center">
              <Link
                href="/notifications"
                className="w-full text-center text-sm text-primary"
              >
                View all notifications
              </Link>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
