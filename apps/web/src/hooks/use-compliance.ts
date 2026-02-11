import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from './use-toast';

export const complianceKeys = {
  all: ['compliance-deadlines'] as const,
  lists: () => [...complianceKeys.all, 'list'] as const,
  list: (filters: any) => [...complianceKeys.lists(), filters] as const,
  details: () => [...complianceKeys.all, 'detail'] as const,
  detail: (id: string) => [...complianceKeys.details(), id] as const,
};

interface CreateDeadlineDto {
  caseId?: string;
  orgId?: string;
  type: 'MCA_FILING' | 'TAX_FILING' | 'ANNUAL_RETURN' | 'BOARD_MEETING' | 'AGM' | 'CUSTOM';
  title: string;
  description?: string;
  dueDate: Date;
  reminderDays?: number[];
  mcaFormType?: string;
  mcaReference?: string;
}

interface UpdateDeadlineDto extends Partial<CreateDeadlineDto> {}

interface DeadlineFilters {
  status?: 'UPCOMING' | 'DUE_SOON' | 'OVERDUE' | 'COMPLETED';
  caseId?: string;
  orgId?: string;
  upcoming?: boolean;
}

/**
 * Get all compliance deadlines with optional filters
 */
export function useComplianceDeadlines(filters?: DeadlineFilters) {
  return useQuery({
    queryKey: complianceKeys.list(filters || {}),
    queryFn: async () => {
      const params: Record<string, string | boolean | undefined> = filters ? { ...filters } : {};
      const response = await apiClient.get('/compliance/deadlines', params);
      return response.data || response;
    },
  });
}

/**
 * Get deadline by ID
 */
export function useComplianceDeadline(id: string) {
  return useQuery({
    queryKey: complianceKeys.detail(id),
    queryFn: async () => {
      const response = await apiClient.get(`/compliance/deadlines/${id}`);
      return response.data || response;
    },
    enabled: !!id,
  });
}

/**
 * Create compliance deadline
 */
export function useCreateDeadline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateDeadlineDto) => {
      const response = await apiClient.post('/compliance/deadlines', data);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.lists() });
      toast({ title: 'Deadline created successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating deadline',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update compliance deadline
 */
export function useUpdateDeadline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateDeadlineDto }) => {
      const response = await apiClient.patch(`/compliance/deadlines/${id}`, data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.lists() });
      queryClient.invalidateQueries({ queryKey: complianceKeys.detail(variables.id) });
      toast({ title: 'Deadline updated successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating deadline',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Mark deadline as completed
 */
export function useCompleteDeadline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.patch(`/compliance/deadlines/${id}/complete`, {});
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.lists() });
      toast({ title: 'Deadline marked as completed', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error completing deadline',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete compliance deadline
 */
export function useDeleteDeadline() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.del(`/compliance/deadlines/${id}`);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: complianceKeys.lists() });
      toast({ title: 'Deadline deleted successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting deadline',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}
