'use client';

import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/status-badge';
import { formatDate } from '@/lib/utils';
import { Skeleton } from '@/components/loading-skeleton';
import { Clock, ArrowRight, UserCheck } from 'lucide-react';

interface CaseHistoryTabProps {
  caseData: any;
}

export function CaseHistoryTab({ caseData }: CaseHistoryTabProps) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['cases', caseData.id, 'history'],
    queryFn: () => apiClient.get(`/cases/${caseData.id}/history`),
    enabled: !!caseData.id,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  const entries = Array.isArray(history) ? history : history?.data || [];

  if (entries.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          No history available
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry: any, index: number) => (
        <div key={entry.id || index} className="flex gap-4 relative">
          {/* Timeline line */}
          {index < entries.length - 1 && (
            <div className="absolute left-[19px] top-10 w-px h-[calc(100%)] bg-border" />
          )}

          {/* Icon */}
          <div className="relative z-10 flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            {entry.type === 'transfer' ? (
              <UserCheck className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Clock className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pb-6">
            <div className="flex items-center gap-2">
              {entry.fromStatus && entry.toStatus ? (
                <div className="flex items-center gap-2">
                  <StatusBadge status={entry.fromStatus} type="case" />
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                  <StatusBadge status={entry.toStatus} type="case" />
                </div>
              ) : (
                <p className="text-sm font-medium">{entry.action || entry.description || 'Status change'}</p>
              )}
            </div>
            {entry.note && <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {entry.actor ? `${entry.actor.firstName} ${entry.actor.lastName}` : 'System'} &bull; {formatDate(entry.createdAt)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
