'use client';

import { useState } from 'react';
import { Plus, Filter, Calendar, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DeadlineCard } from '@/components/compliance/deadline-card';
import { DeadlineDialog, DeadlineFormData } from '@/components/compliance/deadline-dialog';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/loading-skeleton';
import {
  useComplianceDeadlines,
  useCreateDeadline,
  useUpdateDeadline,
  useCompleteDeadline,
  useDeleteDeadline
} from '@/hooks/use-compliance';
import { useAuthStore } from '@/stores/auth-store';

export default function CompliancePage() {
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<'create' | 'edit'>('create');
  const [editingDeadline, setEditingDeadline] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const filters = statusFilter !== 'all' ? { status: statusFilter as any } : undefined;
  const { data: deadlines, isLoading } = useComplianceDeadlines(filters);
  const createDeadline = useCreateDeadline();
  const updateDeadline = useUpdateDeadline();
  const completeDeadline = useCompleteDeadline();
  const deleteDeadlineMutation = useDeleteDeadline();

  const handleCreate = () => {
    setDialogMode('create');
    setEditingDeadline(null);
    setDialogOpen(true);
  };

  const handleEdit = (deadline: any) => {
    setDialogMode('edit');
    setEditingDeadline({
      ...deadline,
      dueDate: new Date(deadline.dueDate).toISOString().split('T')[0],
    });
    setDialogOpen(true);
  };

  const handleSave = async (data: DeadlineFormData) => {
    if (dialogMode === 'create') {
      await createDeadline.mutateAsync({
        ...data,
        dueDate: new Date(data.dueDate),
      });
    } else if (editingDeadline) {
      await updateDeadline.mutateAsync({
        id: editingDeadline.id,
        data: {
          ...data,
          dueDate: new Date(data.dueDate),
        },
      });
    }
  };

  const handleComplete = async (id: string) => {
    await completeDeadline.mutateAsync(id);
  };

  const handleDelete = async () => {
    if (deleteConfirm) {
      await deleteDeadlineMutation.mutateAsync(deleteConfirm);
      setDeleteConfirm(null);
    }
  };

  const deadlinesList = Array.isArray(deadlines) ? deadlines : [];
  const upcomingCount = deadlinesList.filter((d: any) => d.status === 'UPCOMING').length;
  const dueSoonCount = deadlinesList.filter((d: any) => d.status === 'DUE_SOON').length;
  const overdueCount = deadlinesList.filter((d: any) => d.status === 'OVERDUE').length;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Compliance Deadlines</h1>
          <p className="text-muted-foreground">Track and manage compliance filing deadlines</p>
        </div>
        {isStaff && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Deadline
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium text-muted-foreground">Upcoming</span>
          </div>
          <div className="text-2xl font-bold">{upcomingCount}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm font-medium text-muted-foreground">Due Soon</span>
          </div>
          <div className="text-2xl font-bold">{dueSoonCount}</div>
        </div>

        <div className="rounded-lg border p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-muted-foreground">Overdue</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{overdueCount}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Filter:</span>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deadlines</SelectItem>
            <SelectItem value="UPCOMING">Upcoming</SelectItem>
            <SelectItem value="DUE_SOON">Due Soon</SelectItem>
            <SelectItem value="OVERDUE">Overdue</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Deadlines List */}
      {deadlinesList.length > 0 ? (
        <div className="space-y-4">
          {deadlinesList.map((deadline: any) => (
            <DeadlineCard
              key={deadline.id}
              deadline={deadline}
              onEdit={isStaff ? handleEdit : undefined}
              onComplete={isStaff ? handleComplete : undefined}
              onDelete={isStaff ? (id) => setDeleteConfirm(id) : undefined}
              isStaff={isStaff}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Calendar />}
          title="No deadlines found"
          description={
            statusFilter === 'all'
              ? 'Create your first compliance deadline to get started'
              : `No ${statusFilter.toLowerCase()} deadlines`
          }
          action={
            isStaff ? (
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Add Deadline
              </Button>
            ) : undefined
          }
        />
      )}

      {/* Dialogs */}
      <DeadlineDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleSave}
        initialData={editingDeadline}
        isLoading={createDeadline.isPending || updateDeadline.isPending}
        mode={dialogMode}
      />

      <ConfirmDialog
        open={!!deleteConfirm}
        onOpenChange={(open) => !open && setDeleteConfirm(null)}
        title="Delete Deadline"
        description="Are you sure you want to delete this compliance deadline? This action cannot be undone."
        onConfirm={handleDelete}
        isLoading={deleteDeadlineMutation.isPending}
        variant="destructive"
      />
    </div>
  );
}
