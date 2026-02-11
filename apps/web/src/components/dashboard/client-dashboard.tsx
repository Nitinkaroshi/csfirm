'use client';

import Link from 'next/link';
import { Briefcase, FileText, Calendar, ArrowRight, Receipt, AlertTriangle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { useDashboardStats } from '@/hooks/use-dashboard-stats';
import { useComplianceDeadlines } from '@/hooks/use-compliance';
import { Skeleton } from '@/components/loading-skeleton';
import { formatDate, formatCurrency } from '@/lib/utils';

export function ClientDashboard() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: upcomingDeadlines, isLoading: deadlinesLoading } = useComplianceDeadlines({ upcoming: true });

  if (statsLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const cases = stats?.recentCases || [];
  const invoices = stats?.recentInvoices || [];
  const deadlines = Array.isArray(upcomingDeadlines) ? upcomingDeadlines.slice(0, 5) : [];

  const activeCases = cases.filter((c: any) => !['COMPLETED', 'REJECTED'].includes(c.status)).length;
  const pendingInvoices = invoices.filter((i: any) => ['DRAFT', 'ISSUED'].includes(i.status)).length;
  const overdueDeadlines = deadlines.filter((d: any) => d.status === 'OVERDUE').length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-lg bg-gradient-to-r from-primary/10 via-primary/5 to-background border p-6">
        <h2 className="text-xl font-semibold mb-2">Welcome to Your Client Portal</h2>
        <p className="text-muted-foreground">
          Track your cases, view compliance deadlines, and manage documents all in one place.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Cases</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCases}</div>
            <p className="text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Deadlines</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{deadlines.length}</div>
            <p className="text-xs text-muted-foreground">Next 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{overdueDeadlines}</div>
            <p className="text-xs text-muted-foreground">Require attention</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Cases */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>My Cases</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cases">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {cases.length > 0 ? (
              <div className="space-y-3">
                {cases.slice(0, 5).map((case_: any) => (
                  <Link
                    key={case_.id}
                    href={`/cases/${case_.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{case_.caseNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">{case_.service?.name}</p>
                    </div>
                    <StatusBadge status={case_.status} type="case" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No cases yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Compliance Deadlines */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Upcoming Deadlines</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/compliance">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {deadlinesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : deadlines.length > 0 ? (
              <div className="space-y-3">
                {deadlines.map((deadline: any) => (
                  <div key={deadline.id} className="p-3 rounded-lg border">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium text-sm line-clamp-1">{deadline.title}</p>
                      <Badge
                        variant={deadline.status === 'OVERDUE' ? 'destructive' : 'secondary'}
                        className="ml-2 flex-shrink-0 text-xs"
                      >
                        {deadline.status === 'DUE_SOON' ? 'Soon' : deadline.status === 'OVERDUE' ? 'Overdue' : 'Upcoming'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Due: {formatDate(deadline.dueDate)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No upcoming deadlines</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Invoices</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/cases">
                  View All <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice: any) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {invoice.case_?.caseNumber}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(invoice.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(invoice.createdAt)}</p>
                    </div>
                    <StatusBadge status={invoice.status} type="invoice" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
