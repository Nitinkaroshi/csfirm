'use client';

import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/stores/auth-store';

export function useChatRooms(caseId: string) {
  return useQuery({
    queryKey: ['chat', 'rooms', { caseId }],
    queryFn: () => apiClient.get(`/chat/cases/${caseId}/rooms`),
    enabled: !!caseId,
  });
}

export function useChatMessages(roomId: string) {
  return useQuery({
    queryKey: ['chat', 'messages', roomId],
    queryFn: () => apiClient.get(`/chat/rooms/${roomId}/messages?limit=50`),
    enabled: !!roomId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roomId, content }: { roomId: string; content: string }) =>
      apiClient.post(`/chat/rooms/${roomId}/messages`, { content }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', variables.roomId] });
    },
  });
}

export function useChatSocket(roomId: string | null) {
  const queryClient = useQueryClient();
  const socketRef = useRef<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (!roomId) return;

    const socket = getSocket('/chat');
    socketRef.current = socket;

    socket.emit('join:room', { roomId });

    socket.on('message:new', (message: any) => {
      queryClient.invalidateQueries({ queryKey: ['chat', 'messages', roomId] });
    });

    return () => {
      socket.emit('leave:room', { roomId });
      socket.off('message:new');
    };
  }, [roomId, queryClient]);

  const emitTyping = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('user:typing', { roomId, userId: user?.id });
    }
  }, [roomId, user?.id]);

  const emitStoppedTyping = useCallback(() => {
    if (socketRef.current && roomId) {
      socketRef.current.emit('user:stopped-typing', { roomId, userId: user?.id });
    }
  }, [roomId, user?.id]);

  return { emitTyping, emitStoppedTyping };
}
