'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Users, Briefcase, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable, ColumnDef } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { useOrganization, useOrganizationMembers } from '@/hooks/use-organizations';
import { useCases } from '@/hooks/use-cases';
import { Skeleton } from '@/components/loading-skeleton';
import { formatDate } from '@/lib/utils';

export default function OrganizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;

  const { data: org, isLoading } = useOrganization(orgId);
  const { data: membersData } = useOrganizationMembers(orgId);
  const { data: casesData } = useCases({ organizationId: orgId } as any);

  const members = membersData?.data || (Array.isArray(membersData) ? membersData : []);
  const cases = casesData?.data || [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Organization not found</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/organizations')}>Back</Button>
      </div>
    );
  }

  const memberColumns: ColumnDef<any>[] = [
    { header: 'Name', cell: (row: any) => `${row.user?.firstName || ''} ${row.user?.lastName || ''}`.trim() || '—' },
    { header: 'Email', cell: (row: any) => row.user?.email || '—' },
    { header: 'Role', cell: (row: any) => row.role || '—' },
    { header: 'Joined', cell: (row: any) => formatDate(row.createdAt) },
  ];

  const caseColumns: ColumnDef<any>[] = [
    { header: 'Case #', accessorKey: 'caseNumber' },
    { header: 'Service', cell: (row: any) => row.service?.name || '—' },
    { header: 'Status', cell: (row: any) => <StatusBadge status={row.status} type="case" /> },
    { header: 'Created', cell: (row: any) => formatDate(row.createdAt) },
  ];

  const address = org.registeredAddress as any;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/organizations')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">{org.name}</h1>
          {org.cin && <p className="text-sm text-muted-foreground">CIN: {org.cin}</p>}
        </div>
      </div>

      {/* Info Card */}
      <Card>
        <CardHeader><CardTitle className="text-base">Organization Details</CardTitle></CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Type</p>
            <p className="text-sm">{org.type || '—'}</p>
          </div>
          {address && (
            <div>
              <p className="text-sm text-muted-foreground">Registered Address</p>
              <p className="text-sm">
                {[address.street, address.city, address.state, address.pincode].filter(Boolean).join(', ')}
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="text-sm">{formatDate(org.createdAt)}</p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Members + Cases */}
      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">
            <Users className="mr-2 h-4 w-4" />
            Members ({members.length})
          </TabsTrigger>
          <TabsTrigger value="cases">
            <Briefcase className="mr-2 h-4 w-4" />
            Cases ({cases.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <DataTable columns={memberColumns} data={members} emptyMessage="No members" />
        </TabsContent>

        <TabsContent value="cases">
          <DataTable columns={caseColumns} data={cases} emptyMessage="No cases" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
