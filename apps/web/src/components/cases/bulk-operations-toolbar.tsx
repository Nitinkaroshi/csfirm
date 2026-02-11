'use client';

import { useState } from 'react';
import { Users, CheckCircle, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBulkAssign, useBulkUpdateStatus, useBulkAddFlag, useBulkRemoveFlag } from '@/hooks/use-bulk-operations';
import { useEmployees } from '@/hooks/use-employees';
import { CASE_STATUS_LABELS } from '@/lib/constants';

interface BulkOperationsToolbarProps {
  selectedIds: string[];
  onClearSelection: () => void;
}

export function BulkOperationsToolbar({ selectedIds, onClearSelection }: BulkOperationsToolbarProps) {
  const [assignDialog, setAssignDialog] = useState(false);
  const [statusDialog, setStatusDialog] = useState(false);
  const [addFlagDialog, setAddFlagDialog] = useState(false);
  const [removeFlagDialog, setRemoveFlagDialog] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [flagToAdd, setFlagToAdd] = useState('');
  const [flagToRemove, setFlagToRemove] = useState('');

  const { data: employeesData } = useEmployees({ limit: 100 });
  const bulkAssign = useBulkAssign();
  const bulkUpdateStatus = useBulkUpdateStatus();
  const bulkAddFlag = useBulkAddFlag();
  const bulkRemoveFlag = useBulkRemoveFlag();

  const handleBulkAssign = async () => {
    if (!selectedEmployee) return;
    await bulkAssign.mutateAsync({ caseIds: selectedIds, employeeProfileId: selectedEmployee });
    setAssignDialog(false);
    setSelectedEmployee('');
    onClearSelection();
  };

  const handleBulkStatus = async () => {
    if (!selectedStatus) return;
    await bulkUpdateStatus.mutateAsync({ caseIds: selectedIds, status: selectedStatus });
    setStatusDialog(false);
    setSelectedStatus('');
    onClearSelection();
  };

  const handleBulkAddFlag = async () => {
    if (!flagToAdd) return;
    await bulkAddFlag.mutateAsync({ caseIds: selectedIds, flag: flagToAdd });
    setAddFlagDialog(false);
    setFlagToAdd('');
    onClearSelection();
  };

  const handleBulkRemoveFlag = async () => {
    if (!flagToRemove) return;
    await bulkRemoveFlag.mutateAsync({ caseIds: selectedIds, flag: flagToRemove });
    setRemoveFlagDialog(false);
    setFlagToRemove('');
    onClearSelection();
  };

  if (selectedIds.length === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border bg-muted/50 p-3">
        <div className="flex-1 text-sm">
          <span className="font-medium">{selectedIds.length}</span> case{selectedIds.length > 1 ? 's' : ''} selected
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">Bulk Actions</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setAssignDialog(true)}>
              <Users className="mr-2 h-4 w-4" />
              Assign Cases
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusDialog(true)}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Update Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddFlagDialog(true)}>
              <Tag className="mr-2 h-4 w-4" />
              Add Flag
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setRemoveFlagDialog(true)}>
              <X className="mr-2 h-4 w-4" />
              Remove Flag
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="ghost" size="sm" onClick={onClearSelection}>
          Clear
        </Button>
      </div>

      {/* Bulk Assign Dialog */}
      <Dialog open={assignDialog} onOpenChange={setAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign {selectedIds.length} Cases</DialogTitle>
            <DialogDescription>Select an employee to assign the selected cases to.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Employee</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {(employeesData?.data || []).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName} ({emp.assignedCases?.length || 0}/{emp.maxCases} cases)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAssign} disabled={!selectedEmployee || bulkAssign.isPending}>
              {bulkAssign.isPending ? 'Assigning...' : 'Assign Cases'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Status Dialog */}
      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Status for {selectedIds.length} Cases</DialogTitle>
            <DialogDescription>Select the new status for the selected cases.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>New Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CASE_STATUS_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkStatus} disabled={!selectedStatus || bulkUpdateStatus.isPending}>
              {bulkUpdateStatus.isPending ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Add Flag Dialog */}
      <Dialog open={addFlagDialog} onOpenChange={setAddFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Flag to {selectedIds.length} Cases</DialogTitle>
            <DialogDescription>Enter a flag name to add to the selected cases.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Flag Name</Label>
              <Input
                placeholder="e.g., URGENT, REVIEW_REQUIRED"
                value={flagToAdd}
                onChange={(e) => setFlagToAdd(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFlagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkAddFlag} disabled={!flagToAdd || bulkAddFlag.isPending}>
              {bulkAddFlag.isPending ? 'Adding...' : 'Add Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Remove Flag Dialog */}
      <Dialog open={removeFlagDialog} onOpenChange={setRemoveFlagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Flag from {selectedIds.length} Cases</DialogTitle>
            <DialogDescription>Enter the flag name to remove from the selected cases.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Flag Name</Label>
              <Input
                placeholder="e.g., URGENT, REVIEW_REQUIRED"
                value={flagToRemove}
                onChange={(e) => setFlagToRemove(e.target.value.toUpperCase())}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemoveFlagDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleBulkRemoveFlag} disabled={!flagToRemove || bulkRemoveFlag.isPending}>
              {bulkRemoveFlag.isPending ? 'Removing...' : 'Remove Flag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
