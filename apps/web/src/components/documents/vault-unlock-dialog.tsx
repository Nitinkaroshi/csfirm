'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Lock } from 'lucide-react';

interface VaultUnlockDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnlock: (pin: string) => Promise<void>;
  isUnlocking: boolean;
}

export function VaultUnlockDialog({ open, onOpenChange, onUnlock, isUnlocking }: VaultUnlockDialogProps) {
  const { toast } = useToast();
  const [pin, setPin] = useState('');

  const handleUnlock = async () => {
    if (!pin.trim()) {
      toast({ title: 'PIN required', description: 'Please enter your vault PIN', variant: 'destructive' });
      return;
    }
    try {
      await onUnlock(pin);
      toast({ title: 'Vault unlocked', description: 'You can now access sensitive documents.', variant: 'success' });
      setPin('');
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Unlock failed', description: error.message || 'Invalid PIN', variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-500" />
            <DialogTitle>Unlock Vault</DialogTitle>
          </div>
          <DialogDescription>
            Enter your vault PIN to access sensitive documents for this case.
            The session will auto-lock after inactivity.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Vault PIN</Label>
            <Input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="Enter your vault PIN"
              autoFocus
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleUnlock} disabled={isUnlocking || !pin.trim()}>
            {isUnlocking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Lock className="mr-2 h-4 w-4" />
            Unlock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
