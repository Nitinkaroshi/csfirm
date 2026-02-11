'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface DeadlineDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: DeadlineFormData) => Promise<void>;
  initialData?: DeadlineFormData;
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

export interface DeadlineFormData {
  caseId?: string;
  orgId?: string;
  type: 'MCA_FILING' | 'TAX_FILING' | 'ANNUAL_RETURN' | 'BOARD_MEETING' | 'AGM' | 'CUSTOM';
  title: string;
  description?: string;
  dueDate: string;
  reminderDays?: number[];
  mcaFormType?: string;
  mcaReference?: string;
}

const COMPLIANCE_TYPES = [
  { value: 'MCA_FILING', label: 'MCA Filing' },
  { value: 'TAX_FILING', label: 'Tax Filing' },
  { value: 'ANNUAL_RETURN', label: 'Annual Return' },
  { value: 'BOARD_MEETING', label: 'Board Meeting' },
  { value: 'AGM', label: 'Annual General Meeting' },
  { value: 'CUSTOM', label: 'Custom' },
] as const;

const MCA_FORM_TYPES = [
  'AOC-4', 'AOC-4 CFS', 'MGT-7', 'MGT-7A', 'ADT-1', 'DIR-3 KYC',
  'INC-20A', 'MSME Form-I', 'NFRA-2', 'DPT-3', 'MBP-1',
] as const;

export function DeadlineDialog({ open, onOpenChange, onSave, initialData, isLoading, mode }: DeadlineDialogProps) {
  const [formData, setFormData] = useState<DeadlineFormData>({
    type: 'MCA_FILING',
    title: '',
    description: '',
    dueDate: '',
    reminderDays: [7, 3, 1],
    mcaFormType: '',
    mcaReference: '',
  });

  useEffect(() => {
    if (open && initialData) {
      setFormData(initialData);
    } else if (open) {
      setFormData({
        type: 'MCA_FILING',
        title: '',
        description: '',
        dueDate: '',
        reminderDays: [7, 3, 1],
        mcaFormType: '',
        mcaReference: '',
      });
    }
  }, [open, initialData]);

  const handleChange = (field: keyof DeadlineFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    await onSave(formData);
    onOpenChange(false);
  };

  const isValid = formData.title.trim().length > 0 && formData.dueDate.length > 0;
  const isMcaFiling = formData.type === 'MCA_FILING';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Compliance Deadline' : 'Edit Deadline'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Set up a compliance deadline with automatic reminders'
              : 'Update deadline information and reminder settings'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Compliance Type */}
          <div>
            <Label htmlFor="type">Compliance Type</Label>
            <Select value={formData.type} onValueChange={(v) => handleChange('type', v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMPLIANCE_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              placeholder="e.g., File AOC-4 for FY 2023-24"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Additional details about this deadline..."
              rows={3}
            />
          </div>

          {/* Due Date */}
          <div>
            <Label htmlFor="dueDate">Due Date</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => handleChange('dueDate', e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          {/* MCA-specific fields */}
          {isMcaFiling && (
            <>
              <div>
                <Label htmlFor="mcaFormType">MCA Form Type</Label>
                <Select value={formData.mcaFormType} onValueChange={(v) => handleChange('mcaFormType', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select form type" />
                  </SelectTrigger>
                  <SelectContent>
                    {MCA_FORM_TYPES.map((form) => (
                      <SelectItem key={form} value={form}>
                        {form}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="mcaReference">MCA Reference Number (Optional)</Label>
                <Input
                  id="mcaReference"
                  value={formData.mcaReference}
                  onChange={(e) => handleChange('mcaReference', e.target.value)}
                  placeholder="e.g., SRN number"
                />
              </div>
            </>
          )}

          {/* Reminder Days */}
          <div>
            <Label>Reminder Days Before Due Date</Label>
            <div className="flex gap-2 mt-2">
              {[1, 3, 7, 14, 30].map((days) => (
                <Button
                  key={days}
                  type="button"
                  size="sm"
                  variant={formData.reminderDays?.includes(days) ? 'default' : 'outline'}
                  onClick={() => {
                    const current = formData.reminderDays || [];
                    const updated = current.includes(days)
                      ? current.filter((d) => d !== days)
                      : [...current, days].sort((a, b) => b - a);
                    handleChange('reminderDays', updated);
                  }}
                >
                  {days} day{days > 1 ? 's' : ''}
                </Button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Selected: {formData.reminderDays?.sort((a, b) => b - a).join(', ') || 'None'} days before
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create Deadline' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
