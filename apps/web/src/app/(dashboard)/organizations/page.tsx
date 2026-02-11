'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PageHeader } from '@/components/page-header';
import { DataTable, ColumnDef } from '@/components/data-table';
import { useOrganizations } from '@/hooks/use-organizations';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';

export default function OrganizationsPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useOrganizations({
    page,
    limit: 20,
    search: search || undefined,
  });

  const columns: ColumnDef<any>[] = [
    {
      header: 'Organization',
      cell: (row: any) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.cin && <p className="text-xs text-muted-foreground">{row.cin}</p>}
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (row: any) => row.type || '—',
    },
    {
      header: 'Members',
      cell: (row: any) => row._count?.orgUsers || row.memberCount || '—',
    },
    {
      header: 'Cases',
      cell: (row: any) => row._count?.cases || '—',
    },
    {
      header: 'Created',
      cell: (row: any) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organizations"
        description="Manage client organizations"
        actions={
          isStaff ? (
            <Button onClick={() => router.push('/organizations/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Organization
            </Button>
          ) : undefined
        }
      />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search organizations..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={data?.meta ? {
          page: data.meta.page,
          totalPages: data.meta.totalPages,
          total: data.meta.total,
          limit: data.meta.limit,
        } : undefined}
        onPageChange={setPage}
        onRowClick={(row: any) => router.push(`/organizations/${row.id}`)}
        emptyMessage="No organizations found"
        emptyIcon={<Building2 />}
      />
    </div>
  );
}
