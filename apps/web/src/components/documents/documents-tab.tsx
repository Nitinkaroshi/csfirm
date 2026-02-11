'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/empty-state';
import { DocumentCard } from './document-card';
import { UploadDialog } from './upload-dialog';
import { VaultUnlockDialog } from './vault-unlock-dialog';
import { useDocuments } from '@/hooks/use-documents';
import { useVault } from '@/hooks/use-vault';
import { Skeleton } from '@/components/loading-skeleton';
import { Upload, FileText, Shield, LockOpen } from 'lucide-react';

interface DocumentsTabProps {
  caseId: string;
  isStaff?: boolean;
}

export function DocumentsTab({ caseId, isStaff = false }: DocumentsTabProps) {
  const [showUpload, setShowUpload] = useState(false);
  const [showVaultDialog, setShowVaultDialog] = useState(false);
  const { data, isLoading } = useDocuments(caseId);
  const vault = useVault(caseId);

  const documents = data?.data || (Array.isArray(data) ? data : []);
  const hasVaultDocs = documents.some((doc: any) => doc.isVaultProtected);

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">
          {documents.length} document{documents.length !== 1 ? 's' : ''}
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

      {documents.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {documents.map((doc: any) => (
            <DocumentCard
              key={doc.id}
              document={doc}
              caseId={caseId}
              isStaff={isStaff}
              vaultUnlocked={vault.isUnlocked}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<FileText />}
          title="No documents yet"
          description="Upload documents to get started"
          action={
            <Button size="sm" onClick={() => setShowUpload(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          }
        />
      )}

      <UploadDialog open={showUpload} onOpenChange={setShowUpload} caseId={caseId} />
      <VaultUnlockDialog
        open={showVaultDialog}
        onOpenChange={setShowVaultDialog}
        onUnlock={vault.unlock}
        isUnlocking={vault.isUnlocking}
      />
    </div>
  );
}
