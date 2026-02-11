import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['analytics', 'dashboard'],
    queryFn: () => apiClient.get('/analytics/dashboard'),
  });
}

export function useCaseTrends(days: number = 30) {
  return useQuery({
    queryKey: ['analytics', 'case-trends', days],
    queryFn: () => apiClient.get(`/analytics/cases/trends?days=${days}`),
  });
}

export function useRevenueTrends(months: number = 6) {
  return useQuery({
    queryKey: ['analytics', 'revenue-trends', months],
    queryFn: () => apiClient.get(`/analytics/revenue/trends?months=${months}`),
  });
}

export function useEmployeePerformance() {
  return useQuery({
    queryKey: ['analytics', 'employee-performance'],
    queryFn: () => apiClient.get('/analytics/employees/performance'),
  });
}

export function useServiceMetrics() {
  return useQuery({
    queryKey: ['analytics', 'service-metrics'],
    queryFn: () => apiClient.get('/analytics/services/metrics'),
  });
}
