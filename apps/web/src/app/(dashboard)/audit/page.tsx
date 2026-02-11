'use client';

import { useState } from 'react';
import { Search, Shield } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/page-header';
import { DataTable, ColumnDef } from '@/components/data-table';
import { useAuditLogs, useVaultLogs } from '@/hooks/use-audit';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const [auditPage, setAuditPage] = useState(1);
  const [vaultPage, setVaultPage] = useState(1);
  const [entityTypeFilter, setEntityTypeFilter] = useState('');

  const { data: auditData, isLoading: auditLoading } = useAuditLogs({
    page: auditPage,
    limit: 20,
    entityType: entityTypeFilter || undefined,
  });

  const { data: vaultData, isLoading: vaultLoading } = useVaultLogs({ page: vaultPage, limit: 20 });

  const auditColumns: ColumnDef<any>[] = [
    {
      header: 'Event',
      cell: (row: any) => (
        <div>
          <p className="font-medium text-sm">{row.eventType?.replace(/_/g, ' ') || row.action}</p>
          <p className="text-xs text-muted-foreground">{row.entityType} {row.entityId?.slice(0, 8)}...</p>
        </div>
      ),
    },
    {
      header: 'Actor',
      cell: (row: any) => (
        <div>
          <p className="text-sm">{row.actor?.firstName ? `${row.actor.firstName} ${row.actor.lastName}` : row.actorId?.slice(0, 8) || 'System'}</p>
          <p className="text-xs text-muted-foreground">{row.actorRole}</p>
        </div>
      ),
    },
    {
      header: 'Entity',
      cell: (row: any) => (
        <Badge variant="outline">{row.entityType}</Badge>
      ),
    },
    {
      header: 'Timestamp',
      cell: (row: any) => formatDate(row.createdAt || row.timestamp),
    },
  ];

  const vaultColumns: ColumnDef<any>[] = [
    { header: 'Action', cell: (row: any) => row.action || row.eventType || '—' },
    { header: 'User', cell: (row: any) => row.actor?.email || row.userId?.slice(0, 8) || '—' },
    { header: 'Document', cell: (row: any) => row.documentId?.slice(0, 8) || '—' },
    { header: 'Timestamp', cell: (row: any) => formatDate(row.createdAt || row.timestamp) },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Logs"
        description="Track all system activity and vault access"
      />

      <Tabs defaultValue="audit">
        <TabsList>
          <TabsTrigger value="audit">
            <Shield className="mr-2 h-4 w-4" />
            System Logs
          </TabsTrigger>
          <TabsTrigger value="vault">Vault Access</TabsTrigger>
        </TabsList>

        <TabsContent value="audit" className="space-y-4">
          <div className="flex gap-3">
            <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v === 'all' ? '' : v); setAuditPage(1); }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Entities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Entities</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="case">Case</SelectItem>
                <SelectItem value="document">Document</SelectItem>
                <SelectItem value="invoice">Invoice</SelectItem>
                <SelectItem value="organization">Organization</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={auditColumns}
            data={auditData?.data || []}
            isLoading={auditLoading}
            pagination={auditData?.meta ? {
              page: auditData.meta.page,
              totalPages: auditData.meta.totalPages,
              total: auditData.meta.total,
              limit: auditData.meta.limit,
            } : undefined}
            onPageChange={setAuditPage}
            emptyMessage="No audit logs found"
          />
        </TabsContent>

        <TabsContent value="vault">
          <DataTable
            columns={vaultColumns}
            data={vaultData?.data || []}
            isLoading={vaultLoading}
            pagination={vaultData?.meta ? {
              page: vaultData.meta.page,
              totalPages: vaultData.meta.totalPages,
              total: vaultData.meta.total,
              limit: vaultData.meta.limit,
            } : undefined}
            onPageChange={setVaultPage}
            emptyMessage="No vault access logs"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
