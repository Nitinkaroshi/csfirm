'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateService } from '@/hooks/use-services';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const serviceSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  basePrice: z.coerce.number().min(0).optional(),
  defaultDays: z.coerce.number().min(1).optional(),
});

type ServiceFormValues = z.infer<typeof serviceSchema>;

interface ServiceFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function ServiceForm({ open, onOpenChange, onSuccess }: ServiceFormProps) {
  const { toast } = useToast();
  const createService = useCreateService();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceSchema) as any,
  });

  const onSubmit = async (data: ServiceFormValues) => {
    try {
      await createService.mutateAsync({
        name: data.name,
        description: data.description,
        category: data.category,
        basePrice: data.basePrice,
        slaConfig: data.defaultDays ? { defaultDays: data.defaultDays } : undefined,
      });
      toast({ title: 'Service created', variant: 'success' });
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Service Template</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input {...register('name')} placeholder="e.g., Company Incorporation" />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Category *</Label>
            <Select onValueChange={(v) => setValue('category', v)} value={watch('category')}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COMPANY_INCORPORATION">Company Incorporation</SelectItem>
                <SelectItem value="ANNUAL_FILING">Annual Filing</SelectItem>
                <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                <SelectItem value="ADVISORY">Advisory</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...register('description')} placeholder="Describe this service..." />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label>Base Price (INR)</Label>
              <Input {...register('basePrice')} type="number" placeholder="0" />
            </div>
            <div className="space-y-2">
              <Label>SLA Days</Label>
              <Input {...register('defaultDays')} type="number" placeholder="15" />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={createService.isPending}>
              {createService.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Service
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
