import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from './use-toast';

export const tagKeys = {
  all: ['document-tags'] as const,
  byDocument: (documentId: string) => [...tagKeys.all, 'document', documentId] as const,
};

interface CreateTagDto {
  name: string;
  color: string;
}

interface UpdateTagDto {
  name?: string;
  color?: string;
}

/**
 * Get all tags for the firm
 */
export function useDocumentTags() {
  return useQuery({
    queryKey: tagKeys.all,
    queryFn: async () => {
      const response = await apiClient.get('/document-tags');
      return response.data;
    },
  });
}

/**
 * Get tags for a specific document
 */
export function useDocumentTagsById(documentId: string, caseId: string) {
  return useQuery({
    queryKey: tagKeys.byDocument(documentId),
    queryFn: async () => {
      const response = await apiClient.get(`/cases/${caseId}/documents/${documentId}/tags`);
      return response.data;
    },
    enabled: !!documentId && !!caseId,
  });
}

/**
 * Create a new tag
 */
export function useCreateTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateTagDto) => {
      const response = await apiClient.post('/document-tags', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast({ title: 'Tag created successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating tag',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update tag
 */
export function useUpdateTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ tagId, data }: { tagId: string; data: UpdateTagDto }) => {
      const response = await apiClient.patch(`/document-tags/${tagId}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast({ title: 'Tag updated successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating tag',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete tag
 */
export function useDeleteTag() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (tagId: string) => {
      const response = await apiClient.del(`/document-tags/${tagId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tagKeys.all });
      toast({ title: 'Tag deleted successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting tag',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Add tags to document
 */
export function useAddDocumentTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ documentId, caseId, tagIds }: { documentId: string; caseId: string; tagIds: string[] }) => {
      const response = await apiClient.post(`/cases/${caseId}/documents/${documentId}/tags`, { tagIds });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.byDocument(variables.documentId) });
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.caseId] });
      toast({ title: 'Tags added successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error adding tags',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Remove tags from document
 */
export function useRemoveDocumentTags() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ documentId, caseId, tagIds }: { documentId: string; caseId: string; tagIds: string[] }) => {
      const response = await apiClient.del(`/cases/${caseId}/documents/${documentId}/tags`, { tagIds });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: tagKeys.byDocument(variables.documentId) });
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.caseId] });
      toast({ title: 'Tags removed successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error removing tags',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}
