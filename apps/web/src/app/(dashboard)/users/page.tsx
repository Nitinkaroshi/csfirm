'use client';

import { useState } from 'react';
import { Plus, Search, Users as UsersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DataTable, ColumnDef } from '@/components/data-table';
import { useUsers } from '@/hooks/use-users';
import { formatDate } from '@/lib/utils';
import { UserForm } from '@/components/users/user-form';

export default function UsersPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const { data, isLoading } = useUsers({
    page,
    limit: 20,
    search: search || undefined,
    type: typeFilter || undefined,
  });

  const columns: ColumnDef<any>[] = [
    {
      header: 'Name',
      cell: (row: any) => (
        <div>
          <p className="font-medium">{row.firstName} {row.lastName}</p>
          <p className="text-xs text-muted-foreground">{row.email}</p>
        </div>
      ),
    },
    {
      header: 'Type',
      cell: (row: any) => (
        <Badge variant={row.userType === 'STAFF' ? 'default' : 'secondary'}>
          {row.userType}
        </Badge>
      ),
    },
    {
      header: 'Role',
      cell: (row: any) => row.employeeProfile?.role || row.orgUsers?.[0]?.role || '—',
    },
    {
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={row.status === 'active' ? 'default' : 'destructive'}>
          {row.status || 'active'}
        </Badge>
      ),
    },
    {
      header: 'Last Login',
      cell: (row: any) => row.lastLoginAt ? formatDate(row.lastLoginAt) : 'Never',
    },
    {
      header: 'Created',
      cell: (row: any) => formatDate(row.createdAt),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Users"
        description="Manage staff and client users"
        actions={
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="STAFF">Staff</SelectItem>
            <SelectItem value="CLIENT">Client</SelectItem>
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
        emptyMessage="No users found"
        emptyIcon={<UsersIcon />}
      />

      {showCreateForm && (
        <UserForm
          open={showCreateForm}
          onOpenChange={setShowCreateForm}
          onSuccess={() => setShowCreateForm(false)}
        />
      )}
    </div>
  );
}
