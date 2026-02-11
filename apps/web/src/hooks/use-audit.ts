'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useAuditLogs(params: { page?: number; limit?: number; entityType?: string; actorId?: string } = {}) {
  const { page = 1, limit = 20, entityType, actorId } = params;
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));
  if (entityType) queryParams.set('entityType', entityType);
  if (actorId) queryParams.set('actorId', actorId);

  return useQuery({
    queryKey: ['audit-logs', params],
    queryFn: () => apiClient.get(`/audit?${queryParams.toString()}`),
  });
}

export function useVaultLogs(params: { page?: number; limit?: number } = {}) {
  const { page = 1, limit = 20 } = params;
  return useQuery({
    queryKey: ['vault-logs', params],
    queryFn: () => apiClient.get(`/audit/vault?page=${page}&limit=${limit}`),
  });
}
