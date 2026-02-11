'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { PriorityIndicator } from '@/components/priority-indicator';
import { formatDate } from '@/lib/utils';
import { CaseFlags } from './case-flags';
import { useAuthStore } from '@/stores/auth-store';

interface CaseDetailsTabProps {
  caseData: any;
}

export function CaseDetailsTab({ caseData }: CaseDetailsTabProps) {
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Case Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Case Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow label="Case Number" value={caseData.caseNumber} />
          <DetailRow label="Status">
            <StatusBadge status={caseData.status} type="case" />
          </DetailRow>
          <DetailRow label="Priority">
            <PriorityIndicator priority={caseData.priority} />
          </DetailRow>
          <DetailRow label="Service" value={caseData.service?.name || '—'} />
          <DetailRow label="Organization" value={caseData.organization?.name || '—'} />
          <DetailRow label="Created" value={formatDate(caseData.createdAt)} />
          {caseData.dueDate && <DetailRow label="Due Date" value={formatDate(caseData.dueDate)} />}
        </CardContent>
      </Card>

      {/* Assignment & SLA */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assignment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <DetailRow
            label="Assigned To"
            value={caseData.assignee ? `${caseData.assignee.firstName} ${caseData.assignee.lastName}` : 'Unassigned'}
          />
          {caseData.slaDeadline && (
            <DetailRow label="SLA Deadline" value={formatDate(caseData.slaDeadline)} />
          )}
          {caseData.notes && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Notes</p>
              <p className="text-sm mt-1">{caseData.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Form Data */}
      {caseData.formData && Object.keys(caseData.formData).length > 0 && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Form Data</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {Object.entries(caseData.formData).map(([key, value]) => (
                <DetailRow key={key} label={key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())} value={String(value)} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Flags (Staff only) */}
      {isStaff && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Internal Flags</CardTitle>
          </CardHeader>
          <CardContent>
            <CaseFlags caseId={caseData.id} flags={caseData.internalFlags || []} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      {children || <p className="text-sm">{value || '—'}</p>}
    </div>
  );
}
