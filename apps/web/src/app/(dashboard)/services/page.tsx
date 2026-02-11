'use client';

import { useState } from 'react';
import { Plus, Search, FileText, Copy, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { PageHeader } from '@/components/page-header';
import { DataTable, ColumnDef } from '@/components/data-table';
import { useServices, useDuplicateService } from '@/hooks/use-services';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/lib/utils';
import { ServiceForm } from '@/components/services/service-form';

export default function ServicesPage() {
  const { toast } = useToast();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const duplicateService = useDuplicateService();

  const { data, isLoading } = useServices({ page, limit: 20, search: search || undefined });

  const handleDuplicate = async (id: string) => {
    try {
      await duplicateService.mutateAsync(id);
      toast({ title: 'Service duplicated', variant: 'success' });
    } catch (error: any) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    }
  };

  const columns: ColumnDef<any>[] = [
    {
      header: 'Service',
      cell: (row: any) => (
        <div>
          <p className="font-medium">{row.name}</p>
          {row.description && <p className="text-xs text-muted-foreground line-clamp-1">{row.description}</p>}
        </div>
      ),
    },
    { header: 'Category', cell: (row: any) => row.category?.replace(/_/g, ' ') || '—' },
    {
      header: 'Base Price',
      cell: (row: any) => row.billingTemplate?.basePrice ? formatCurrency(row.billingTemplate.basePrice) : '—',
    },
    { header: 'Version', accessorKey: 'version' },
    {
      header: 'Status',
      cell: (row: any) => (
        <Badge variant={row.isActive ? 'default' : 'secondary'}>
          {row.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      header: '',
      cell: (row: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleDuplicate(row.id)}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
      className: 'w-10',
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service Templates"
        description="Manage service types and configurations"
        actions={
          <Button onClick={() => setShowCreate(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Service
          </Button>
        }
      />

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
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
        emptyMessage="No service templates found"
        emptyIcon={<FileText />}
      />

      {showCreate && (
        <ServiceForm open={showCreate} onOpenChange={setShowCreate} onSuccess={() => setShowCreate(false)} />
      )}
    </div>
  );
}
