'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface FolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: { name: string; color?: string }) => Promise<void>;
  initialData?: { name: string; color?: string };
  isLoading?: boolean;
  mode: 'create' | 'edit';
}

const PRESET_COLORS = [
  '#6366f1', // indigo
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#3b82f6', // blue
  '#ef4444', // red
  '#64748b', // slate
];

export function FolderDialog({ open, onOpenChange, onSave, initialData, isLoading, mode }: FolderDialogProps) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string | undefined>(PRESET_COLORS[0]);

  useEffect(() => {
    if (open) {
      setName(initialData?.name || '');
      setColor(initialData?.color || PRESET_COLORS[0]);
    }
  }, [open, initialData]);

  const handleSave = async () => {
    await onSave({ name, color });
    onOpenChange(false);
  };

  const isValid = name.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Folder' : 'Edit Folder'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new folder to organize your documents'
              : 'Update folder name and color'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="name">Folder Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Incorporation Documents"
              autoFocus
            />
          </div>

          <div>
            <Label>Folder Color</Label>
            <div className="flex gap-2 mt-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className="w-8 h-8 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: presetColor,
                    borderColor: color === presetColor ? '#000' : 'transparent',
                    transform: color === presetColor ? 'scale(1.1)' : 'scale(1)',
                  }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isLoading}>
            {isLoading ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
