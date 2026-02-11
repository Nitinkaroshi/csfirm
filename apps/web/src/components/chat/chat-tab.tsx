'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageList } from './message-list';
import { MessageInput } from './message-input';
import { useChatRooms, useChatMessages, useSendMessage, useChatSocket } from '@/hooks/use-chat';
import { useAuthStore } from '@/stores/auth-store';
import { Skeleton } from '@/components/loading-skeleton';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ChatTabProps {
  caseId: string;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  CLIENT_CASE: 'Client Chat',
  INTERNAL_CASE: 'Internal Chat',
  INTERNAL_GENERAL: 'General',
};

export function ChatTab({ caseId }: ChatTabProps) {
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';
  const { data: roomsData, isLoading: roomsLoading } = useChatRooms(caseId);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const rooms = roomsData?.data || (Array.isArray(roomsData) ? roomsData : []);

  // Auto-select first room
  const activeRoomId = selectedRoomId || rooms[0]?.id || null;

  const { data: messagesData, isLoading: messagesLoading } = useChatMessages(activeRoomId || '');
  const sendMessage = useSendMessage();
  const { emitTyping, emitStoppedTyping } = useChatSocket(activeRoomId);

  const messages = messagesData?.data || (Array.isArray(messagesData) ? messagesData : []);

  const handleSend = async (content: string) => {
    if (!activeRoomId) return;
    await sendMessage.mutateAsync({ roomId: activeRoomId, content });
  };

  if (roomsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-[400px]" />
        </CardContent>
      </Card>
    );
  }

  if (rooms.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageCircle className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No chat rooms available for this case</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Room Tabs */}
      {rooms.length > 1 && (
        <div className="flex border-b bg-muted/30 px-2 pt-2 gap-1">
          {rooms.map((room: any) => (
            <button
              key={room.id}
              onClick={() => setSelectedRoomId(room.id)}
              className={cn(
                'px-3 py-2 text-sm font-medium rounded-t-md transition-colors',
                room.id === activeRoomId
                  ? 'bg-background text-foreground border border-b-0'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {ROOM_TYPE_LABELS[room.roomType] || room.name || 'Chat'}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex flex-col h-[500px]">
        <div className="flex-1 overflow-hidden">
          <MessageList
            messages={messages}
            currentUserId={user?.id || ''}
            isLoading={messagesLoading}
          />
        </div>

        <div className="border-t p-3">
          <MessageInput
            onSend={handleSend}
            onTyping={emitTyping}
            onStoppedTyping={emitStoppedTyping}
            disabled={sendMessage.isPending}
          />
        </div>
      </div>
    </Card>
  );
}
