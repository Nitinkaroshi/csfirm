'use client';

import { useRouter } from 'next/navigation';
import { Briefcase, FileText, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/status-badge';
import { StatCard } from './stat-card';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { Skeleton } from '@/components/loading-skeleton';
import { formatDate } from '@/lib/utils';

export function StaffDashboard() {
  const router = useRouter();
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="p-6">
            <Skeleton className="h-4 w-32 mb-4" />
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full mb-2" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Cases"
          value={stats?.totalCases || 0}
          icon={Briefcase}
          description="All time"
        />
        <StatCard
          title="Active Cases"
          value={stats?.activeCases || 0}
          icon={Clock}
          description="Currently in progress"
        />
        <StatCard
          title="Pending Documents"
          value={stats?.pendingDocuments || 0}
          icon={FileText}
          description="Awaiting review"
        />
        <StatCard
          title="Overdue Invoices"
          value={stats?.overdueInvoices || 0}
          icon={AlertTriangle}
          description="Past due date"
        />
      </div>

      {/* Recent Cases */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">Recent Cases</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => router.push('/cases')}>
            View all
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats?.recentCases && stats.recentCases.length > 0 ? (
            <div className="space-y-4">
              {stats.recentCases.map((case_: any) => (
                <div
                  key={case_.id}
                  className="flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => router.push(`/cases/${case_.id}`)}
                >
                  <div className="space-y-1">
                    <p className="font-medium">{case_.caseNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {case_.organization?.name || 'Unknown Organization'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={case_.status} type="case" />
                    <span className="text-sm text-muted-foreground">
                      {formatDate(case_.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle className="h-12 w-12 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No cases yet</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => router.push('/cases/new')}>
                Create your first case
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
