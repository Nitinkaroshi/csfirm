import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { CaseStatus, StaffRole } from '@prisma/client';

export type AllowedRole = StaffRole | 'CLIENT';

export type SideEffect =
  | 'EMIT_STATUS_CHANGED'
  | 'EMIT_SUBMITTED'
  | 'EMIT_COMPLETED'
  | 'EMIT_REJECTED'
  | 'EMIT_DOCS_REQUESTED'
  | 'AUTO_ASSIGN'
  | 'SET_SLA_DEADLINE'
  | 'SET_COMPLETED_AT'
  | 'CREATE_CHAT_ROOMS'
  | 'NOTIFY_CLIENT';

export interface Transition {
  from: CaseStatus;
  to: CaseStatus;
  allowedRoles: AllowedRole[];
  sideEffects: SideEffect[];
  requiresReason?: boolean;
}

const TRANSITIONS: Transition[] = [
  // DRAFT → SUBMITTED (Client submits case)
  {
    from: CaseStatus.DRAFT,
    to: CaseStatus.SUBMITTED,
    allowedRoles: ['CLIENT'],
    sideEffects: ['EMIT_SUBMITTED', 'AUTO_ASSIGN', 'SET_SLA_DEADLINE', 'CREATE_CHAT_ROOMS'],
  },

  // SUBMITTED → UNDER_REVIEW (Staff picks up)
  {
    from: CaseStatus.SUBMITTED,
    to: CaseStatus.UNDER_REVIEW,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },

  // UNDER_REVIEW → DOCS_REQUIRED (Staff requests documents)
  {
    from: CaseStatus.UNDER_REVIEW,
    to: CaseStatus.DOCS_REQUIRED,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_DOCS_REQUESTED', 'NOTIFY_CLIENT'],
  },

  // UNDER_REVIEW → PROCESSING (Staff starts processing)
  {
    from: CaseStatus.UNDER_REVIEW,
    to: CaseStatus.PROCESSING,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },

  // UNDER_REVIEW → REJECTED (Management rejects)
  {
    from: CaseStatus.UNDER_REVIEW,
    to: CaseStatus.REJECTED,
    allowedRoles: [StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_REJECTED', 'SET_COMPLETED_AT', 'NOTIFY_CLIENT'],
    requiresReason: true,
  },

  // DOCS_REQUIRED → UNDER_REVIEW (Client re-submits docs)
  {
    from: CaseStatus.DOCS_REQUIRED,
    to: CaseStatus.UNDER_REVIEW,
    allowedRoles: ['CLIENT'],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },

  // PROCESSING → COMPLETED
  {
    from: CaseStatus.PROCESSING,
    to: CaseStatus.COMPLETED,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_COMPLETED', 'SET_COMPLETED_AT', 'NOTIFY_CLIENT'],
  },

  // PROCESSING → REJECTED
  {
    from: CaseStatus.PROCESSING,
    to: CaseStatus.REJECTED,
    allowedRoles: [StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_REJECTED', 'SET_COMPLETED_AT', 'NOTIFY_CLIENT'],
    requiresReason: true,
  },

  // PROCESSING → DOCS_REQUIRED (need more docs during processing)
  {
    from: CaseStatus.PROCESSING,
    to: CaseStatus.DOCS_REQUIRED,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_DOCS_REQUESTED', 'NOTIFY_CLIENT'],
  },

  // PROCESSING → UNDER_REVIEW (rollback, rare)
  {
    from: CaseStatus.PROCESSING,
    to: CaseStatus.UNDER_REVIEW,
    allowedRoles: [StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },
];

@Injectable()
export class CaseStateMachine {
  findTransition(from: CaseStatus, to: CaseStatus, actorRole: AllowedRole): Transition {
    const transition = TRANSITIONS.find((t) => t.from === from && t.to === to);

    if (!transition) {
      throw new BadRequestException({
        code: 'CASE_INVALID_TRANSITION',
        message: `Invalid transition: ${from} → ${to}`,
      });
    }

    if (!transition.allowedRoles.includes(actorRole)) {
      throw new ForbiddenException({
        code: 'CASE_TRANSITION_FORBIDDEN',
        message: `Role ${actorRole} cannot perform transition ${from} → ${to}`,
      });
    }

    return transition;
  }

  getAvailableTransitions(currentStatus: CaseStatus, actorRole: AllowedRole): { to: CaseStatus; label: string }[] {
    return TRANSITIONS.filter(
      (t) => t.from === currentStatus && t.allowedRoles.includes(actorRole),
    ).map((t) => ({
      to: t.to,
      label: this.getTransitionLabel(t.to),
    }));
  }

  canTransition(from: CaseStatus, to: CaseStatus, actorRole: AllowedRole): boolean {
    const transition = TRANSITIONS.find((t) => t.from === from && t.to === to);
    return !!transition && transition.allowedRoles.includes(actorRole);
  }

  private getTransitionLabel(status: CaseStatus): string {
    const labels: Record<CaseStatus, string> = {
      [CaseStatus.DRAFT]: 'Save as Draft',
      [CaseStatus.SUBMITTED]: 'Submit Case',
      [CaseStatus.UNDER_REVIEW]: 'Start Review',
      [CaseStatus.DOCS_REQUIRED]: 'Request Documents',
      [CaseStatus.PROCESSING]: 'Start Processing',
      [CaseStatus.COMPLETED]: 'Mark Completed',
      [CaseStatus.REJECTED]: 'Reject Case',
    };
    return labels[status] || status;
  }
}
