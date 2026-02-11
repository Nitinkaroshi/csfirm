'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CaseTransferDialog } from './case-transfer-dialog';
import { useTransitionCase } from '@/hooks/use-cases';
import { useToast } from '@/hooks/use-toast';
import { CASE_TRANSITIONS, CASE_STATUS_LABELS } from '@/lib/constants';
import type { CaseStatus } from '@/lib/constants';
import { ArrowRightCircle, UserPlus } from 'lucide-react';

interface CaseStatusActionsProps {
  caseData: any;
}

export function CaseStatusActions({ caseData }: CaseStatusActionsProps) {
  const { toast } = useToast();
  const transitionCase = useTransitionCase();
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [showTransfer, setShowTransfer] = useState(false);

  const allowedTransitions = CASE_TRANSITIONS[caseData.status as CaseStatus] || [];

  const handleTransition = async (nextStatus: string) => {
    try {
      await transitionCase.mutateAsync({ id: caseData.id, status: nextStatus });
      toast({ title: 'Status updated', description: `Case transitioned to ${CASE_STATUS_LABELS[nextStatus as CaseStatus] || nextStatus}`, variant: 'success' });
      setConfirmAction(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to update status', variant: 'destructive' });
    }
  };

  if (allowedTransitions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 p-4 bg-muted/50 rounded-lg border">
        <span className="text-sm font-medium text-muted-foreground mr-2">Actions:</span>
        {allowedTransitions.map((nextStatus) => (
          <Button
            key={nextStatus}
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction(nextStatus)}
          >
            <ArrowRightCircle className="mr-1 h-3.5 w-3.5" />
            {CASE_STATUS_LABELS[nextStatus as CaseStatus] || nextStatus}
          </Button>
        ))}
        <Button variant="outline" size="sm" onClick={() => setShowTransfer(true)}>
          <UserPlus className="mr-1 h-3.5 w-3.5" />
          Transfer
        </Button>
      </div>

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Confirm Status Change"
        description={`Are you sure you want to transition this case to "${CASE_STATUS_LABELS[confirmAction as CaseStatus] || confirmAction}"?`}
        onConfirm={() => confirmAction && handleTransition(confirmAction)}
        isLoading={transitionCase.isPending}
      />

      <CaseTransferDialog
        open={showTransfer}
        onOpenChange={setShowTransfer}
        caseId={caseData.id}
      />
    </>
  );
}
