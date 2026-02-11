'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { DocumentCard } from './document-card';
import { UploadDialog } from './upload-dialog';
import { VaultUnlockDialog } from './vault-unlock-dialog';
import { FolderTree } from './folder-tree';
import { FolderDialog } from './folder-dialog';
import { TagManager } from './tag-manager';
import { useDocuments } from '@/hooks/use-documents';
import { useVault } from '@/hooks/use-vault';
import { useFolderTree, useCreateFolder, useUpdateFolder, useDeleteFolder } from '@/hooks/use-document-folders';
import { useDocumentTags, useCreateTag, useAddDocumentTags, useRemoveDocumentTags } from '@/hooks/use-document-tags';
import { Skeleton } from '@/components/loading-skeleton';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileText, Shield, LockOpen, Tags } from 'lucide-react';
import { ConfirmDialog } from '@/components/confirm-dialog';

interface EnhancedDocumentsTabProps {
  caseId: string;
  isStaff?: boolean;
}

export function EnhancedDocumentsTab({ caseId, isStaff = false }: EnhancedDocumentsTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDialogMode, setFolderDialogMode] = useState<'create' | 'edit'>('create');
  const [editingFolder, setEditingFolder] = useState<any>(null);
  const [parentFolderId, setParentFolderId] = useState<string | undefined>(undefined);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedDocumentForTags, setSelectedDocumentForTags] = useState<any>(null);

  const { data: documentsData, isLoading: documentsLoading } = useDocuments(caseId);
  const { data: foldersData, isLoading: foldersLoading } = useFolderTree(caseId);
  const { data: tagsData } = useDocumentTags();
  const vault = useVault(caseId);

  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const createTag = useCreateTag();
  const addDocumentTags = useAddDocumentTags();
  const removeDocumentTags = useRemoveDocumentTags();

  const documents = documentsData?.data || (Array.isArray(documentsData) ? documentsData : []);
  const folders = foldersData || [];
  const tags = tagsData || [];
  const hasVaultDocs = documents.some((doc: any) => doc.isVaultProtected);

  // Filter documents by selected folder
  const filteredDocuments = selectedFolderId
    ? documents.filter((doc: any) => doc.folderId === selectedFolderId)
    : documents.filter((doc: any) => !doc.folderId); // Show root documents when no folder selected

  const handleCreateFolder = (parentId?: string) => {
    setParentFolderId(parentId);
    setFolderDialogMode('create');
    setEditingFolder(null);
    setFolderDialogOpen(true);
  };

  const handleEditFolder = (folderId: string) => {
    // Find folder in tree (recursive search needed)
    const findFolder = (folders: any[], id: string): any => {
      for (const folder of folders) {
        if (folder.id === id) return folder;
        if (folder.children) {
          const found = findFolder(folder.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const folder = findFolder(folders, folderId);
    if (folder) {
      setEditingFolder(folder);
      setFolderDialogMode('edit');
      setFolderDialogOpen(true);
    }
  };

  const handleSaveFolder = async (data: { name: string; color?: string }) => {
    if (folderDialogMode === 'create') {
      await createFolder.mutateAsync({
        caseId,
        name: data.name,
        color: data.color,
        parentId: parentFolderId,
      });
    } else if (editingFolder) {
      await updateFolder.mutateAsync({
        folderId: editingFolder.id,
        caseId,
        data,
      });
    }
  };

  const handleDeleteFolder = async () => {
    if (deleteConfirm) {
      await deleteFolder.mutateAsync({ folderId: deleteConfirm, caseId });
      setDeleteConfirm(null);
      if (selectedFolderId === deleteConfirm) {
        setSelectedFolderId(null);
      }
    }
  };

  const handleManageTags = (document: any) => {
    setSelectedDocumentForTags(document);
    setTagDialogOpen(true);
  };

  const handleAddTag = async (tagId: string) => {
    if (selectedDocumentForTags) {
      await addDocumentTags.mutateAsync({
        documentId: selectedDocumentForTags.id,
        caseId,
        tagIds: [tagId],
      });
    }
  };

  const handleRemoveTag = async (tagId: string) => {
    if (selectedDocumentForTags) {
      await removeDocumentTags.mutateAsync({
        documentId: selectedDocumentForTags.id,
        caseId,
        tagIds: [tagId],
      });
    }
  };

  const handleCreateTag = async (data: { name: string; color: string }) => {
    await createTag.mutateAsync(data);
  };

  if (documentsLoading || foldersLoading) {
    return (
      <div className="grid gap-4 grid-cols-12">
        <div className="col-span-3">
          <Skeleton className="h-96" />
        </div>
        <div className="col-span-9 grid gap-4 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 grid-cols-12">
      {/* Folder Sidebar */}
      <div className="col-span-3 border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-3">Folders</h3>
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onSelectFolder={setSelectedFolderId}
          onCreateFolder={handleCreateFolder}
          onEditFolder={handleEditFolder}
          onDeleteFolder={(folderId) => setDeleteConfirm(folderId)}
          canEdit={isStaff}
        />
      </div>

      {/* Documents Area */}
      <div className="col-span-9 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? 's' : ''}
            {selectedFolderId && ' in this folder'}
          </h3>
          <div className="flex items-center gap-2">
            {isStaff && hasVaultDocs && (
              vault.isUnlocked ? (
                <Button size="sm" variant="outline" onClick={() => vault.lock()}>
                  <LockOpen className="mr-2 h-4 w-4 text-green-500" />
                  Vault Open
                </Button>
              ) : (
                <Button size="sm" variant="outline" onClick={() => setShowVaultDialog(true)}>
                  <Shield className="mr-2 h-4 w-4 text-amber-500" />
                  Unlock Vault
                </Button>
              )
            )}
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload Document
            </Button>
          </div>
        </div>

        {filteredDocuments.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {filteredDocuments.map((doc: any) => (
              <div key={doc.id} className="relative group">
                <DocumentCard
                  document={doc}
                  caseId={caseId}
                  isStaff={isStaff}
                  vaultUnlocked={vault.isUnlocked}
                />
                {isStaff && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => handleManageTags(doc)}
                  >
                    <Tags className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<FileText />}
            title={selectedFolderId ? 'No documents in this folder' : 'No documents yet'}
            description={selectedFolderId ? 'Upload or move documents to this folder' : 'Upload documents to get started'}
            action={
              <Button size="sm" onClick={() => setShowUpload(true)}>
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
            }
          />
        )}
      </div>

      {/* Dialogs */}
      <UploadDialog open={showUpload} onOpenChange={setShowUpload} caseId={caseId} />
      <VaultUnlockDialog
        open={showVaultDialog}
        onOpenChange={setShowVaultDialog}
        onUnlock={vault.unlock}
        isUnlocking={vault.isUnlocking}
      />
      <FolderDialog
        open={folderDialogOpen}
        onOpenChange={setFolderDialogOpen}
        onSave={handleSaveFolder}
        initialData={editingFolder}
        isLoading={createFolder.isPending || updateFolder.isPending}
        mode={folderDialogMode}
      />
      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Folder"
        description="Are you sure you want to delete this folder? The folder must be empty."
        onConfirm={handleDeleteFolder}
        isLoading={deleteFolder.isPending}
        variant="destructive"
      />

      {/* Tag Management Dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage Tags</DialogTitle>
            <DialogDescription>
              Add or remove tags for {selectedDocumentForTags?.fileName}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <TagManager
              availableTags={tags}
              selectedTagIds={selectedDocumentForTags?.tags?.map((t: any) => t.id) || []}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              onCreateTag={handleCreateTag}
              canCreate={isStaff}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
