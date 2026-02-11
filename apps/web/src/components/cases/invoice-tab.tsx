'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { InvoiceEditorDialog, InvoiceFormData } from '@/components/invoices/invoice-editor-dialog';
import { useInvoices, useCreateInvoice, useIssueInvoice, useMarkInvoicePaid, useCancelInvoice } from '@/hooks/use-invoices';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/loading-skeleton';
import { Plus, Send, CheckCircle, XCircle, Receipt, Download, Edit } from 'lucide-react';
import { RazorpayButton } from '@/components/payment/razorpay-button';
import { useAuthStore } from '@/stores/auth-store';

interface InvoiceTabProps {
  caseId: string;
  organizationId?: string;
}

export function InvoiceTab({ caseId, organizationId }: InvoiceTabProps) {
  const { toast } = useToast();
  const { user } = useAuthStore();
  const isClient = user?.userType === 'CLIENT';
  const { data, isLoading } = useInvoices({ caseId });
  const createInvoice = useCreateInvoice();
  const issueInvoice = useIssueInvoice();
  const markPaid = useMarkInvoicePaid();
  const cancelInvoice = useCancelInvoice();
  const [confirmAction, setConfirmAction] = useState<{ type: string; id: string } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<any | null>(null);

  const invoices = data?.data || [];

  const handleAction = async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'issue') await issueInvoice.mutateAsync(confirmAction.id);
      else if (confirmAction.type === 'pay') await markPaid.mutateAsync({ id: confirmAction.id });
      else if (confirmAction.type === 'cancel') await cancelInvoice.mutateAsync(confirmAction.id);
      toast({ title: 'Invoice updated', variant: 'success' });
      setConfirmAction(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleOpenEditor = (invoice?: any) => {
    setEditingInvoice(invoice || null);
    setEditorOpen(true);
  };

  const handleSaveInvoice = async (formData: InvoiceFormData) => {
    try {
      await createInvoice.mutateAsync({
        caseId,
        organizationId,
        ...formData,
      });
      toast({ title: 'Invoice saved successfully', variant: 'success' });
      setEditorOpen(false);
      setEditingInvoice(null);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      throw error;
    }
  };

  const handleDownloadPdf = async (invoiceId: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/invoices/${invoiceId}/pdf`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to download PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to download PDF', variant: 'destructive' });
    }
  };

  if (isLoading) return <Skeleton className="h-48" />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">{invoices.length} invoice{invoices.length !== 1 ? 's' : ''}</h3>
        <Button size="sm" onClick={() => handleOpenEditor()}>
          <Plus className="mr-2 h-4 w-4" />
          Create Invoice
        </Button>
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No invoices for this case</p>
          </CardContent>
        </Card>
      ) : (
        invoices.map((inv: any) => (
          <Card key={inv.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{inv.invoiceNumber}</p>
                  <p className="text-sm text-muted-foreground">{formatDate(inv.createdAt)}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold">{formatCurrency(inv.totalAmount)}</p>
                  <StatusBadge status={inv.status} type="invoice" />
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                {inv.status === 'DRAFT' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => handleOpenEditor(inv)}>
                      <Edit className="mr-1 h-3 w-3" /> Edit
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'issue', id: inv.id })}>
                      <Send className="mr-1 h-3 w-3" /> Issue
                    </Button>
                  </>
                )}
                {inv.status === 'ISSUED' && (
                  <>
                    {isClient && inv.organization ? (
                      <RazorpayButton
                        invoice={{
                          id: inv.id,
                          invoiceNumber: inv.invoiceNumber,
                          totalAmount: inv.totalAmount,
                          currency: inv.currency,
                        }}
                        organization={{
                          name: inv.organization?.name || 'Organization',
                        }}
                        onSuccess={() => {
                          toast({ title: 'Payment Successful', description: 'Invoice paid successfully', variant: 'success' });
                        }}
                        className="h-8 text-xs"
                      />
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => setConfirmAction({ type: 'pay', id: inv.id })}>
                        <CheckCircle className="mr-1 h-3 w-3" /> Mark Paid
                      </Button>
                    )}
                  </>
                )}
                {['ISSUED', 'PAID'].includes(inv.status) && (
                  <Button size="sm" variant="outline" onClick={() => handleDownloadPdf(inv.id)}>
                    <Download className="mr-1 h-3 w-3" /> Download PDF
                  </Button>
                )}
                {['DRAFT', 'ISSUED'].includes(inv.status) && (
                  <Button size="sm" variant="ghost" onClick={() => setConfirmAction({ type: 'cancel', id: inv.id })}>
                    <XCircle className="mr-1 h-3 w-3" /> Cancel
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))
      )}

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title={`Confirm ${confirmAction?.type === 'issue' ? 'Issue' : confirmAction?.type === 'pay' ? 'Payment' : 'Cancellation'}`}
        description={`Are you sure you want to ${confirmAction?.type} this invoice?`}
        variant={confirmAction?.type === 'cancel' ? 'destructive' : 'default'}
        onConfirm={handleAction}
        isLoading={issueInvoice.isPending || markPaid.isPending || cancelInvoice.isPending}
      />

      <InvoiceEditorDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        onSave={handleSaveInvoice}
        initialData={
          editingInvoice
            ? {
                lineItems: editingInvoice.lineItems || [],
                notes: editingInvoice.notes,
                taxRate: editingInvoice.taxRate,
                dueDate: editingInvoice.dueDate
                  ? new Date(editingInvoice.dueDate).toISOString().split('T')[0]
                  : undefined,
              }
            : undefined
        }
        isLoading={createInvoice.isPending}
      />
    </div>
  );
}
