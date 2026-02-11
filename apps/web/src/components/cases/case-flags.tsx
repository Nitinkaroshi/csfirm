'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAddCaseFlag, useRemoveCaseFlag } from '@/hooks/use-cases';
import { useToast } from '@/hooks/use-toast';
import { Plus, X } from 'lucide-react';

interface CaseFlagsProps {
  caseId: string;
  flags: string[];
}

export function CaseFlags({ caseId, flags }: CaseFlagsProps) {
  const { toast } = useToast();
  const addFlag = useAddCaseFlag();
  const removeFlag = useRemoveCaseFlag();
  const [newFlag, setNewFlag] = useState('');
  const [showInput, setShowInput] = useState(false);

  const handleAddFlag = async () => {
    if (!newFlag.trim()) return;
    try {
      await addFlag.mutateAsync({ id: caseId, flag: newFlag.trim().toUpperCase() });
      setNewFlag('');
      setShowInput(false);
      toast({ title: 'Flag added', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const handleRemoveFlag = async (flag: string) => {
    try {
      await removeFlag.mutateAsync({ id: caseId, flag });
      toast({ title: 'Flag removed', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {flags.map((flag) => (
        <Badge key={flag} variant="secondary" className="gap-1">
          {flag}
          <button onClick={() => handleRemoveFlag(flag)} className="ml-1 hover:text-destructive">
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      {showInput ? (
        <div className="flex items-center gap-1">
          <Input
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddFlag()}
            placeholder="Flag name"
            className="h-7 w-32 text-xs"
            autoFocus
          />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={handleAddFlag}>
            <Plus className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setShowInput(false)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setShowInput(true)}>
          <Plus className="mr-1 h-3 w-3" />
          Add Flag
        </Button>
      )}
      {flags.length === 0 && !showInput && (
        <span className="text-sm text-muted-foreground">No flags set</span>
      )}
    </div>
  );
}
