'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface CreateOrderData {
  invoiceId: string;
  currency?: string;
  notes?: Record<string, string>;
}

interface VerifyPaymentData {
  invoiceId: string;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
  paymentMethod?: string;
}

export function useCreatePaymentOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateOrderData) => {
      const response = await apiClient.post('/payment/create-order', data);
      return response.data || response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });
}

export function useVerifyPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: VerifyPaymentData) => {
      const response = await apiClient.post('/payment/verify', data);
      return response.data || response;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', variables.invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function usePaymentStatus(invoiceId: string | null) {
  return useQuery({
    queryKey: ['payment', 'status', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return null;
      const response = await apiClient.get(`/payment/status/${invoiceId}`);
      return response.data || response;
    },
    enabled: !!invoiceId,
  });
}
