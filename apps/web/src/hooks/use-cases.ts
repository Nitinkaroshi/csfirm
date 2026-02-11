'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CaseListParams {
  page?: number;
  limit?: number;
  status?: string;
  priority?: string;
  assigneeId?: string;
  search?: string;
}

export function useCases(params: CaseListParams = {}) {
  const { page = 1, limit = 20, status, priority, assigneeId, search } = params;
  const queryParams = new URLSearchParams();
  queryParams.set('page', String(page));
  queryParams.set('limit', String(limit));
  if (status) queryParams.set('status', status);
  if (priority) queryParams.set('priority', priority);
  if (assigneeId) queryParams.set('assigneeId', assigneeId);
  if (search) queryParams.set('search', search);

  return useQuery({
    queryKey: ['cases', params],
    queryFn: () => apiClient.get(`/cases?${queryParams.toString()}`),
  });
}

export function useCase(id: string) {
  return useQuery({
    queryKey: ['cases', id],
    queryFn: () => apiClient.get(`/cases/${id}`),
    enabled: !!id,
  });
}

export function useCreateCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => apiClient.post('/cases', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
    },
  });
}

export function useTransitionCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, reason }: { id: string; status: string; reason?: string }) =>
      apiClient.patch(`/cases/${id}/status`, { status, reason }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases', variables.id] });
    },
  });
}

export function useTransferCase() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; toEmployeeId: string; reason: string }) =>
      apiClient.post(`/cases/${id}/transfer`, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      queryClient.invalidateQueries({ queryKey: ['cases', variables.id] });
    },
  });
}

export function useAddCaseFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, flag }: { id: string; flag: string }) =>
      apiClient.post(`/cases/${id}/flags`, { flag }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.id] });
    },
  });
}

export function useRemoveCaseFlag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, flag }: { id: string; flag: string }) =>
      apiClient.patch(`/cases/${id}/flags/remove`, { flag }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['cases', variables.id] });
    },
  });
}
