'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateOrganization, useUpdateOrganization } from '@/hooks/use-organizations';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const orgSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  cin: z.string().optional(),
  type: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
});

type OrgFormValues = z.infer<typeof orgSchema>;

interface OrganizationFormProps {
  organization?: any;
  onSuccess?: () => void;
}

export function OrganizationForm({ organization, onSuccess }: OrganizationFormProps) {
  const { toast } = useToast();
  const createOrg = useCreateOrganization();
  const updateOrg = useUpdateOrganization();
  const isEdit = !!organization;

  const address = organization?.registeredAddress as any;

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: organization?.name || '',
      cin: organization?.cin || '',
      type: organization?.type || '',
      street: address?.street || '',
      city: address?.city || '',
      state: address?.state || '',
      pincode: address?.pincode || '',
    },
  });

  const onSubmit = async (data: OrgFormValues) => {
    const payload = {
      name: data.name,
      cin: data.cin,
      type: data.type,
      registeredAddress: {
        street: data.street,
        city: data.city,
        state: data.state,
        pincode: data.pincode,
      },
    };

    try {
      if (isEdit) {
        await updateOrg.mutateAsync({ id: organization.id, ...payload });
        toast({ title: 'Organization updated', variant: 'success' });
      } else {
        await createOrg.mutateAsync(payload);
        toast({ title: 'Organization created', variant: 'success' });
      }
      onSuccess?.();
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const isPending = createOrg.isPending || updateOrg.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? 'Edit Organization' : 'New Organization'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Organization Name *</Label>
              <Input {...register('name')} placeholder="e.g., Acme Private Limited" />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>CIN</Label>
              <Input {...register('cin')} placeholder="Corporate Identity Number" />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select onValueChange={(v) => setValue('type', v)} value={watch('type')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PRIVATE_LIMITED">Private Limited</SelectItem>
                  <SelectItem value="PUBLIC_LIMITED">Public Limited</SelectItem>
                  <SelectItem value="LLP">LLP</SelectItem>
                  <SelectItem value="OPC">One Person Company</SelectItem>
                  <SelectItem value="PARTNERSHIP">Partnership</SelectItem>
                  <SelectItem value="PROPRIETORSHIP">Proprietorship</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="pt-2">
            <Label className="text-base font-medium">Registered Address</Label>
            <div className="grid gap-4 md:grid-cols-2 mt-2">
              <div className="space-y-2 md:col-span-2">
                <Label>Street</Label>
                <Input {...register('street')} placeholder="Street address" />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input {...register('city')} placeholder="City" />
              </div>
              <div className="space-y-2">
                <Label>State</Label>
                <Input {...register('state')} placeholder="State" />
              </div>
              <div className="space-y-2">
                <Label>Pincode</Label>
                <Input {...register('pincode')} placeholder="Pincode" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Update' : 'Create'} Organization
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
