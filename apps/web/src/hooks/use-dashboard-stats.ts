'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface DashboardStats {
  totalCases: number;
  activeCases: number;
  pendingDocuments: number;
  overdueInvoices: number;
  recentCases: any[];
  recentInvoices: any[];
  casesByStatus: Record<string, number>;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => {
      // Fetch multiple endpoints in parallel to build stats
      const [casesRes, activeCasesRes, invoicesRes] = await Promise.all([
        apiClient.get('/cases?limit=5&page=1'),
        apiClient.get('/cases?limit=1&status=PROCESSING'),
        apiClient.get('/invoices?limit=100&page=1'),
      ]);

      const cases = casesRes.data || [];
      const totalCases = casesRes.meta?.total || 0;
      const activeCases = activeCasesRes.meta?.total || 0;

      const invoices = invoicesRes.data || [];
      const overdueInvoices = invoices.filter(
        (i: any) => i.status === 'ISSUED' && new Date(i.dueDate) < new Date(),
      ).length;

      return {
        totalCases,
        activeCases,
        pendingDocuments: 0,
        overdueInvoices,
        recentCases: cases.slice(0, 5),
        recentInvoices: invoices.slice(0, 5),
        casesByStatus: cases.reduce((acc: Record<string, number>, c: any) => {
          acc[c.status] = (acc[c.status] || 0) + 1;
          return acc;
        }, {}),
      };
    },
    staleTime: 30 * 1000,
  });
}
