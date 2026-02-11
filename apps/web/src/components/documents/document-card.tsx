'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useVerifyDocument, useRejectDocument } from '@/hooks/use-documents';
import { useToast } from '@/hooks/use-toast';
import { formatDate } from '@/lib/utils';
import { FileText, Download, CheckCircle, XCircle, Eye, Shield } from 'lucide-react';

interface DocumentCardProps {
  document: any;
  caseId: string;
  isStaff?: boolean;
  vaultUnlocked?: boolean;
}

export function DocumentCard({ document: doc, caseId, isStaff, vaultUnlocked }: DocumentCardProps) {
  const { toast } = useToast();
  const verifyDoc = useVerifyDocument(caseId);
  const rejectDoc = useRejectDocument(caseId);
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);

  const handleVerify = async () => {
    try {
      await verifyDoc.mutateAsync(doc.id);
      toast({ title: 'Document verified', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleReject = async () => {
    try {
      await rejectDoc.mutateAsync({ id: doc.id, reason: 'Document does not meet requirements' });
      toast({ title: 'Document rejected', variant: 'success' });
      setShowRejectConfirm(false);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isVaultLocked = doc.isVaultProtected && !vaultUnlocked;
  const fileIcon = doc.isVaultProtected
    ? <Shield className="h-10 w-10 text-amber-500" />
    : <FileText className="h-10 w-10 text-muted-foreground" />;

  return (
    <>
      <Card className={isVaultLocked ? 'opacity-60' : ''}>
        <CardContent className="p-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
              {fileIcon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{doc.fileName || doc.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {doc.documentType && <span>{doc.documentType} &bull; </span>}
                    {formatDate(doc.createdAt)}
                    {doc.isVaultProtected && <span> &bull; Vault Protected</span>}
                  </p>
                </div>
                <StatusBadge status={doc.status || 'ACTIVE'} type="document" />
              </div>

              <div className="flex items-center gap-1 mt-3">
                {isVaultLocked ? (
                  <span className="text-xs text-muted-foreground">Unlock vault to access</span>
                ) : doc.downloadUrl ? (
                  <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
                    <a href={doc.downloadUrl} target="_blank" rel="noopener noreferrer">
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </a>
                  </Button>
                ) : null}
                {isStaff && doc.status === 'PENDING_REVIEW' && (
                  <>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-green-600" onClick={handleVerify} disabled={verifyDoc.isPending}>
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Verify
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-600" onClick={() => setShowRejectConfirm(true)}>
                      <XCircle className="mr-1 h-3 w-3" />
                      Reject
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showRejectConfirm}
        onOpenChange={setShowRejectConfirm}
        title="Reject Document"
        description="Are you sure you want to reject this document? The client will need to re-upload."
        variant="destructive"
        confirmLabel="Reject"
        onConfirm={handleReject}
        isLoading={rejectDoc.isPending}
      />
    </>
  );
}
