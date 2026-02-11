import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';

interface EmployeesFilter {
  page?: number;
  limit?: number;
  role?: string;
}

export function useEmployees(filters?: EmployeesFilter) {
  const queryParams = new URLSearchParams();
  if (filters?.page) queryParams.set('page', filters.page.toString());
  if (filters?.limit) queryParams.set('limit', filters.limit.toString());
  if (filters?.role) queryParams.set('role', filters.role);

  return useQuery({
    queryKey: ['employees', filters],
    queryFn: () => apiClient.get(`/users/employees?${queryParams.toString()}`),
  });
}

export function useEmployee(id: string) {
  return useQuery({
    queryKey: ['employees', id],
    queryFn: () => apiClient.get(`/users/employees/${id}`),
    enabled: !!id,
  });
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      apiClient.patch(`/users/employees/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      toast.success('Employee updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update employee');
    },
  });
}
