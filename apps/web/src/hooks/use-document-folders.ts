import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useToast } from './use-toast';

export const folderKeys = {
  all: ['document-folders'] as const,
  byCase: (caseId: string) => [...folderKeys.all, caseId] as const,
};

interface CreateFolderDto {
  caseId: string;
  name: string;
  parentId?: string;
  color?: string;
}

interface UpdateFolderDto {
  name?: string;
  color?: string;
}

/**
 * Get folder tree for a case
 */
export function useFolderTree(caseId: string) {
  return useQuery({
    queryKey: folderKeys.byCase(caseId),
    queryFn: async () => {
      const response = await apiClient.get(`/cases/${caseId}/documents/folders`);
      return response.data;
    },
    enabled: !!caseId,
  });
}

/**
 * Create a new folder
 */
export function useCreateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: CreateFolderDto) => {
      const response = await apiClient.post(`/cases/${data.caseId}/documents/folders`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.byCase(variables.caseId) });
      toast({ title: 'Folder created successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error creating folder',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Update folder
 */
export function useUpdateFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ folderId, caseId, data }: { folderId: string; caseId: string; data: UpdateFolderDto }) => {
      const response = await apiClient.patch(`/cases/${caseId}/documents/folders/${folderId}`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.byCase(variables.caseId) });
      toast({ title: 'Folder updated successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error updating folder',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Delete folder
 */
export function useDeleteFolder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ folderId, caseId }: { folderId: string; caseId: string }) => {
      const response = await apiClient.del(`/cases/${caseId}/documents/folders/${folderId}`);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.byCase(variables.caseId) });
      toast({ title: 'Folder deleted successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error deleting folder',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}

/**
 * Move document to folder
 */
export function useMoveDocument() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ documentId, caseId, folderId }: { documentId: string; caseId: string; folderId?: string | null }) => {
      const response = await apiClient.patch(`/cases/${caseId}/documents/${documentId}/move`, { folderId });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: folderKeys.byCase(variables.caseId) });
      queryClient.invalidateQueries({ queryKey: ['case-documents', variables.caseId] });
      toast({ title: 'Document moved successfully', variant: 'success' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error moving document',
        description: error.response?.data?.message || error.message,
        variant: 'destructive',
      });
    },
  });
}
