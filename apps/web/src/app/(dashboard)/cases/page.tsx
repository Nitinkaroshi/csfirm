'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { PageHeader } from '@/components/page-header';
import { DataTable, ColumnDef } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { PriorityIndicator } from '@/components/priority-indicator';
import { BulkOperationsToolbar } from '@/components/cases/bulk-operations-toolbar';
import { useCases } from '@/hooks/use-cases';
import { useAuthStore } from '@/stores/auth-store';
import { formatDate } from '@/lib/utils';
import { CASE_STATUS_LABELS } from '@/lib/constants';

export default function CasesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data, isLoading } = useCases({
    page,
    limit: 20,
    search: search || undefined,
    status: statusFilter || undefined,
    priority: priorityFilter || undefined,
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(data?.data?.map((c: any) => c.id) || []);
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    }
  };

  const columns: ColumnDef<any>[] = [
    ...(isStaff
      ? [
          {
            header: () => (
              <Checkbox
                checked={selectedIds.length > 0 && selectedIds.length === data?.data?.length}
                onCheckedChange={handleSelectAll}
              />
            ),
            cell: (row: any) => (
              <Checkbox
                checked={selectedIds.includes(row.id)}
                onCheckedChange={(checked) => handleSelectRow(row.id, checked as boolean)}
                onClick={(e) => e.stopPropagation()}
              />
            ),
          },
        ]
      : []),
    {
      header: 'Case #',
      accessorKey: 'caseNumber',
      cell: (row: any) => (
        <span className="font-medium text-primary cursor-pointer hover:underline">{row.caseNumber}</span>
      ),
    },
    {
      header: 'Organization',
      cell: (row: any) => row.organization?.name || '—',
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
    ...(isStaff
      ? [
          {
            header: 'Assignee',
            cell: (row: any) =>
              row.assignee ? `${row.assignee.firstName} ${row.assignee.lastName}` : 'Unassigned',
          },
        ]
      : []),
    {
      header: 'Created',
      cell: (row: any) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cases"
        description="Manage and track all compliance cases"
        actions={
          isStaff ? (
            <Button onClick={() => router.push('/cases/new')}>
              <Plus className="mr-2 h-4 w-4" />
              New Case
            </Button>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search cases..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(CASE_STATUS_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={priorityFilter}
          onValueChange={(v) => {
            setPriorityFilter(v === 'all' ? '' : v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="LOW">Low</SelectItem>
            <SelectItem value="NORMAL">Normal</SelectItem>
            <SelectItem value="HIGH">High</SelectItem>
            <SelectItem value="URGENT">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Operations Toolbar */}
      {isStaff && <BulkOperationsToolbar selectedIds={selectedIds} onClearSelection={() => setSelectedIds([])} />}

      {/* Table */}
      <DataTable
        columns={columns}
        data={data?.data || []}
        isLoading={isLoading}
        pagination={
          data?.meta
            ? {
                page: data.meta.page,
                totalPages: data.meta.totalPages,
                total: data.meta.total,
                limit: data.meta.limit,
              }
            : undefined
        }
        onPageChange={setPage}
        onRowClick={(row: any) => router.push(`/cases/${row.id}`)}
        emptyMessage="No cases found"
      />
    </div>
  );
}
