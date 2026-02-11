'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface VaultState {
  isUnlocked: boolean;
  sessionId: string | null;
  caseId: string | null;
}

export function useVault(caseId: string) {
  const [state, setState] = useState<VaultState>({ isUnlocked: false, sessionId: null, caseId: null });
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unlockMutation = useMutation({
    mutationFn: (pin: string) => apiClient.post(`/vault/${caseId}/unlock`, { pin }),
    onSuccess: (data: any) => {
      setState({ isUnlocked: true, sessionId: data.sessionId, caseId });
      startHeartbeat(data.sessionId);
    },
  });

  const startHeartbeat = useCallback((sessionId: string) => {
    if (heartbeatRef.current) clearInterval(heartbeatRef.current);

    heartbeatRef.current = setInterval(async () => {
      try {
        await apiClient.post(`/vault/${caseId}/heartbeat`, {}, {
          headers: { 'x-vault-session': sessionId },
        });
      } catch {
        // Session expired
        setState({ isUnlocked: false, sessionId: null, caseId: null });
        if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      }
    }, 60 * 1000); // Every 60 seconds
  }, [caseId]);

  const lockMutation = useMutation({
    mutationFn: async () => {
      if (!state.sessionId) return;
      return apiClient.post(`/vault/${caseId}/lock`, {}, {
        headers: { 'x-vault-session': state.sessionId },
      });
    },
    onSuccess: () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
      setState({ isUnlocked: false, sessionId: null, caseId: null });
    },
  });

  useEffect(() => {
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, []);

  return {
    isUnlocked: state.isUnlocked,
    sessionId: state.sessionId,
    unlock: unlockMutation.mutateAsync,
    lock: lockMutation.mutateAsync,
    isUnlocking: unlockMutation.isPending,
    error: unlockMutation.error,
  };
}
