'use client';

import { Calendar, Clock, AlertCircle, CheckCircle2, Building2, Briefcase, Edit2, Trash2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatDate, cn } from '@/lib/utils';

interface DeadlineCardProps {
  deadline: any;
  onEdit?: (deadline: any) => void;
  onComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  isStaff?: boolean;
}

const STATUS_CONFIG = {
  UPCOMING: { label: 'Upcoming', color: 'bg-blue-100 text-blue-800', icon: Clock },
  DUE_SOON: { label: 'Due Soon', color: 'bg-amber-100 text-amber-800', icon: AlertCircle },
  OVERDUE: { label: 'Overdue', color: 'bg-red-100 text-red-800', icon: AlertCircle },
  COMPLETED: { label: 'Completed', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
};

const TYPE_CONFIG = {
  MCA_FILING: { label: 'MCA Filing', color: '#6366f1' },
  TAX_FILING: { label: 'Tax Filing', color: '#8b5cf6' },
  ANNUAL_RETURN: { label: 'Annual Return', color: '#ec4899' },
  BOARD_MEETING: { label: 'Board Meeting', color: '#f59e0b' },
  AGM: { label: 'AGM', color: '#10b981' },
  CUSTOM: { label: 'Custom', color: '#64748b' },
};

function getDaysUntilDue(dueDate: string): number {
  const today = new Date();
  const due = new Date(dueDate);
  const diffTime = due.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function DeadlineCard({ deadline, onEdit, onComplete, onDelete, isStaff = false }: DeadlineCardProps) {
  const statusConfig = STATUS_CONFIG[deadline.status as keyof typeof STATUS_CONFIG];
  const typeConfig = TYPE_CONFIG[deadline.type as keyof typeof TYPE_CONFIG];
  const StatusIcon = statusConfig.icon;
  const daysUntil = getDaysUntilDue(deadline.dueDate);
  const isCompleted = deadline.status === 'COMPLETED';
  const isOverdue = deadline.status === 'OVERDUE';

  return (
    <Card className={cn('transition-all hover:shadow-md', isOverdue && 'border-red-300')}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 space-y-3">
            {/* Header */}
            <div className="flex items-start gap-3">
              <div
                className="w-1 h-16 rounded-full flex-shrink-0"
                style={{ backgroundColor: typeConfig.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" style={{ borderColor: typeConfig.color, color: typeConfig.color }}>
                    {typeConfig.label}
                  </Badge>
                  <Badge className={statusConfig.color}>
                    <StatusIcon className="h-3 w-3 mr-1" />
                    {statusConfig.label}
                  </Badge>
                </div>
                <h3 className="font-semibold text-lg leading-tight">{deadline.title}</h3>
                {deadline.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{deadline.description}</p>
                )}
              </div>
            </div>

            {/* Metadata */}
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>
                  Due: {formatDate(deadline.dueDate)}
                  {!isCompleted && (
                    <span className={cn('ml-1 font-medium', isOverdue ? 'text-red-600' : daysUntil <= 3 ? 'text-amber-600' : '')}>
                      ({daysUntil > 0 ? `${daysUntil} days left` : `${Math.abs(daysUntil)} days overdue`})
                    </span>
                  )}
                </span>
              </div>

              {deadline.case_ && (
                <div className="flex items-center gap-1.5">
                  <Briefcase className="h-4 w-4" />
                  <span>
                    {deadline.case_.caseNumber} - {deadline.case_.organization?.name}
                  </span>
                </div>
              )}

              {deadline.organization && !deadline.case_ && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  <span>{deadline.organization.name}</span>
                </div>
              )}

              {deadline.mcaFormType && (
                <div className="flex items-center gap-1.5">
                  <span className="font-medium">Form: {deadline.mcaFormType}</span>
                </div>
              )}
            </div>

            {/* Completion info */}
            {isCompleted && deadline.completedByUser && (
              <div className="text-sm text-muted-foreground">
                <CheckCircle2 className="h-4 w-4 inline mr-1 text-green-600" />
                Completed by {deadline.completedByUser.user.firstName} {deadline.completedByUser.user.lastName} on{' '}
                {formatDate(deadline.completedAt)}
              </div>
            )}
          </div>

          {/* Actions */}
          {isStaff && (
            <div className="flex flex-col gap-2 ml-4">
              {!isCompleted && onComplete && (
                <Button size="sm" variant="outline" onClick={() => onComplete(deadline.id)} className="h-8">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Complete
                </Button>
              )}
              {onEdit && (
                <Button size="sm" variant="ghost" onClick={() => onEdit(deadline)} className="h-8">
                  <Edit2 className="h-4 w-4" />
                </Button>
              )}
              {onDelete && (
                <Button size="sm" variant="ghost" onClick={() => onDelete(deadline.id)} className="h-8 text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
