'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTransferCase } from '@/hooks/use-cases';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

interface CaseTransferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  caseId: string;
}

export function CaseTransferDialog({ open, onOpenChange, caseId }: CaseTransferDialogProps) {
  const { toast } = useToast();
  const transferCase = useTransferCase();
  const [toEmployeeId, setToEmployeeId] = useState('');
  const [reason, setReason] = useState('');

  const { data: users } = useQuery({
    queryKey: ['users', 'staff'],
    queryFn: () => apiClient.get('/users?type=STAFF&limit=100'),
    enabled: open,
  });

  const handleTransfer = async () => {
    if (!toEmployeeId || !reason.trim()) {
      toast({ title: 'Error', description: 'Please select an employee and provide a reason', variant: 'destructive' });
      return;
    }

    try {
      await transferCase.mutateAsync({ id: caseId, toEmployeeId, reason });
      toast({ title: 'Case transferred', description: 'Case has been transferred successfully.', variant: 'success' });
      onOpenChange(false);
      setToEmployeeId('');
      setReason('');
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to transfer case', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Transfer Case</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Transfer To *</Label>
            <Select value={toEmployeeId} onValueChange={setToEmployeeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {(users?.data || []).map((u: any) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.firstName} {u.lastName} ({u.email})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Reason *</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide a reason for the transfer..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleTransfer} disabled={transferCase.isPending}>
            {transferCase.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Transfer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
