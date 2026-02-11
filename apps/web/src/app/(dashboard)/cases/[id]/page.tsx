'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { StatusBadge } from '@/components/status-badge';
import { PriorityIndicator } from '@/components/priority-indicator';
import { useCase } from '@/hooks/use-cases';
import { Skeleton } from '@/components/loading-skeleton';
import { CaseDetailTabs } from './case-detail-tabs';

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params.id as string;
  const { data: caseData, isLoading } = useCase(caseId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Case not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/cases')}>Back to Cases</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/cases')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-3">
            {caseData.caseNumber}
            <StatusBadge status={caseData.status} type="case" />
          </h1>
          <p className="text-muted-foreground mt-1">
            {caseData.organization?.name} &bull; {caseData.service?.name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PriorityIndicator priority={caseData.priority} />
        </div>
      </div>

      <CaseDetailTabs caseData={caseData} />
    </div>
  );
}
