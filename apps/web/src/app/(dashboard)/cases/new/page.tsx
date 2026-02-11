'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { useCreateCase } from '@/hooks/use-cases';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/lib/api-client';
import { Loader2 } from 'lucide-react';

const createCaseSchema = z.object({
  serviceId: z.string().min(1, 'Service is required'),
  organizationId: z.string().min(1, 'Organization is required'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']),
  notes: z.string().optional(),
});

type CreateCaseForm = z.infer<typeof createCaseSchema>;

export default function NewCasePage() {
  const router = useRouter();
  const { toast } = useToast();
  const createCase = useCreateCase();

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<CreateCaseForm>({
    resolver: zodResolver(createCaseSchema),
    defaultValues: { priority: 'NORMAL' },
  });

  const { data: services } = useQuery({
    queryKey: ['services', 'active'],
    queryFn: () => apiClient.get('/service-templates?active=true'),
  });

  const { data: organizations } = useQuery({
    queryKey: ['organizations'],
    queryFn: () => apiClient.get('/organizations'),
  });

  const onSubmit = async (data: CreateCaseForm) => {
    try {
      const result = await createCase.mutateAsync(data);
      toast({ title: 'Case created', description: `Case ${result.caseNumber} created successfully.`, variant: 'success' });
      router.push(`/cases/${result.id}`);
    } catch (error: any) {
      toast({ title: 'Error', description: error.message || 'Failed to create case', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="New Case" description="Create a new compliance case" />

      <form onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Case Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="serviceId">Service *</Label>
                <Select onValueChange={(v) => setValue('serviceId', v)} value={watch('serviceId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                  <SelectContent>
                    {(services?.data || []).map((svc: any) => (
                      <SelectItem key={svc.id} value={svc.id}>{svc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.serviceId && <p className="text-sm text-destructive">{errors.serviceId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizationId">Organization *</Label>
                <Select onValueChange={(v) => setValue('organizationId', v)} value={watch('organizationId')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select organization" />
                  </SelectTrigger>
                  <SelectContent>
                    {(organizations?.data || []).map((org: any) => (
                      <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.organizationId && <p className="text-sm text-destructive">{errors.organizationId.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select onValueChange={(v) => setValue('priority', v as any)} value={watch('priority')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea {...register('notes')} placeholder="Additional notes or instructions..." />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={createCase.isPending}>
                {createCase.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Case
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
