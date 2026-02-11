import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

export function useBulkAssign() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseIds, employeeProfileId }: { caseIds: string[]; employeeProfileId: string }) =>
      apiClient.post('/cases/bulk/assign', { caseIds, employeeProfileId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Cases assigned successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign cases');
    },
  });
}

export function useBulkUpdateStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseIds, status }: { caseIds: string[]; status: string }) =>
      apiClient.post('/cases/bulk/status', { caseIds, status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Case statuses updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update case statuses');
    },
  });
}

export function useBulkAddFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseIds, flag }: { caseIds: string[]; flag: string }) =>
      apiClient.post('/cases/bulk/flag/add', { caseIds, flag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Flag added to cases successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add flag');
    },
  });
}

export function useBulkRemoveFlag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ caseIds, flag }: { caseIds: string[]; flag: string }) =>
      apiClient.post('/cases/bulk/flag/remove', { caseIds, flag }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cases'] });
      toast.success('Flag removed from cases successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to remove flag');
    },
  });
}
