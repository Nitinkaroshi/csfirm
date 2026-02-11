'use client';

import { useState } from 'react';
import { Bell, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/page-header';
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from '@/hooks/use-notifications';
import { formatRelativeTime, cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Notification Row
// ---------------------------------------------------------------------------

function NotificationRow({
  notification,
  onMarkAsRead,
}: {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
}) {
  return (
    <div
      className={cn(
        'flex items-start gap-4 rounded-lg border p-4 transition-colors',
        !notification.isRead && 'bg-accent/40 border-primary/20',
      )}
    >
      <div
        className={cn(
          'mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
          !notification.isRead ? 'bg-primary/10' : 'bg-muted',
        )}
      >
        <Bell
          className={cn(
            'h-4 w-4',
            !notification.isRead ? 'text-primary' : 'text-muted-foreground',
          )}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={cn(
              'text-sm font-medium',
              notification.isRead && 'text-muted-foreground',
            )}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <Badge variant="default" className="h-5 text-[10px]">
              New
            </Badge>
          )}
        </div>
        <p className="mt-0.5 text-sm text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <div className="mt-1 flex items-center gap-3">
          <span className="text-xs text-muted-foreground/70">
            {formatRelativeTime(notification.createdAt)}
          </span>
          <Badge variant="outline" className="text-[10px]">
            {notification.eventType.replace(/\./g, ' ')}
          </Badge>
        </div>
      </div>

      {!notification.isRead && (
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-xs"
          onClick={() => onMarkAsRead(notification.id)}
        >
          <Check className="mr-1 h-3 w-3" />
          Read
        </Button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function NotificationsPage() {
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const { data: unreadCount = 0 } = useUnreadCount();
  const { data, isLoading } = useNotifications({
    page,
    limit: 20,
    unreadOnly: filter === 'unread' ? true : undefined,
  });
  const markAsRead = useMarkAsRead();
  const markAllAsRead = useMarkAllAsRead();

  const notifications = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
            : 'All caught up'
        }
        actions={
          unreadCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllAsRead.mutate()}
              disabled={markAllAsRead.isPending}
            >
              {markAllAsRead.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Check className="mr-2 h-4 w-4" />
              )}
              Mark all as read
            </Button>
          ) : undefined
        }
      />

      <Tabs
        value={filter}
        onValueChange={(v) => {
          setFilter(v as 'all' | 'unread');
          setPage(1);
        }}
      >
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="unread">
            Unread
            {unreadCount > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="mt-4">
          {isLoading && (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          )}

          {!isLoading && notifications.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Bell className="mx-auto h-12 w-12 text-muted-foreground/30" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {filter === 'unread'
                    ? 'No unread notifications'
                    : 'No notifications yet'}
                </p>
              </CardContent>
            </Card>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="space-y-2">
              {notifications.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onMarkAsRead={(id) => markAsRead.mutate(id)}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {meta.page} of {meta.totalPages} ({meta.total} total)
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
