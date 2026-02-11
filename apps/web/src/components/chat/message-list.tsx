'use client';

import { useEffect, useRef } from 'react';
import { cn, getInitials, formatDate } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/loading-skeleton';

interface Message {
  id: string;
  content: string;
  senderId: string;
  sender?: { firstName: string; lastName: string };
  createdAt: string;
}

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  isLoading?: boolean;
}

export function MessageList({ messages, currentUserId, isLoading }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 h-full overflow-y-auto">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className={cn('flex gap-2', i % 2 === 0 ? '' : 'justify-end')}>
            {i % 2 === 0 && <Skeleton className="h-8 w-8 rounded-full" />}
            <Skeleton className={cn('h-12', i % 2 === 0 ? 'w-48' : 'w-36')} />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No messages yet. Start the conversation!
      </div>
    );
  }

  return (
    <div ref={containerRef} className="p-4 space-y-3 h-full overflow-y-auto">
      {messages.map((msg) => {
        const isOwn = msg.senderId === currentUserId;
        const senderName = msg.sender
          ? `${msg.sender.firstName} ${msg.sender.lastName}`
          : 'Unknown';

        return (
          <div key={msg.id} className={cn('flex gap-2', isOwn ? 'justify-end' : '')}>
            {!isOwn && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs">
                  {getInitials(msg.sender?.firstName || '?', msg.sender?.lastName || '?')}
                </AvatarFallback>
              </Avatar>
            )}
            <div className={cn('max-w-[70%]', isOwn ? 'order-first' : '')}>
              {!isOwn && (
                <p className="text-xs text-muted-foreground mb-1">{senderName}</p>
              )}
              <div
                className={cn(
                  'rounded-lg px-3 py-2 text-sm',
                  isOwn
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                )}
              >
                {msg.content}
              </div>
              <p className={cn('text-[10px] text-muted-foreground mt-1', isOwn ? 'text-right' : '')}>
                {formatDate(msg.createdAt)}
              </p>
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
