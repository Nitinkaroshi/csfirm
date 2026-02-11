'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/page-header';
import { DataTable, ColumnDef } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { PriorityIndicator } from '@/components/priority-indicator';
import { useCases } from '@/hooks/use-cases';
import { formatDate } from '@/lib/utils';
import { CASE_STATUS_LABELS } from '@/lib/constants';

export default function MyCasesPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const { data, isLoading } = useCases({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const columns: ColumnDef<any>[] = [
    {
      header: 'Case #',
      accessorKey: 'caseNumber',
      cell: (row: any) => (
        <span className="font-medium text-primary cursor-pointer hover:underline">
          {row.caseNumber}
        </span>
      ),
    },
    {
      header: 'Service',
      cell: (row: any) => row.service?.name || '—',
    },
    {
      header: 'Status',
      cell: (row: any) => <StatusBadge status={row.status} type="case" />,
    },
    {
      header: 'Priority',
      cell: (row: any) => <PriorityIndicator priority={row.priority} />,
    },
    {
      header: 'Created',
      cell: (row: any) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Cases"
        description="Track the progress of your compliance cases"
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(CASE_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        onRowClick={(row: any) => router.push(`/cases/${row.id}`)}
        emptyMessage="No cases found"
      />
    </div>
  );
}
