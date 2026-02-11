'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

export function useDocuments(caseId: string) {
  return useQuery({
    queryKey: ['documents', { caseId }],
    queryFn: () => apiClient.get(`/cases/${caseId}/documents`),
    enabled: !!caseId,
  });
}

export function useUploadDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ caseId, file, documentType }: { caseId: string; file: File; documentType?: string }) => {
      // Step 1: Request presigned upload URL
      const { document: doc, uploadUrl } = await apiClient.post<{
        document: { id: string };
        uploadUrl: string;
      }>(`/cases/${caseId}/documents/upload`, {
        filename: file.name,
        contentType: file.type,
        securityLevel: 'NORMAL',
        category: documentType,
      });

      // Step 2: Upload file directly to presigned URL
      await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      // Step 3: Confirm upload with file size
      return apiClient.patch(`/cases/${caseId}/documents/${doc.id}/confirm`, {
        fileSize: file.size,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useVerifyDocument(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.patch(`/cases/${caseId}/documents/${id}/verify`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useRejectDocument(caseId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiClient.patch(`/cases/${caseId}/documents/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
