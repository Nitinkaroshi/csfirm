# 07 — Case State Machine Design

## Overview

The case status is governed by a **finite state machine (FSM)**. Transitions are:
- Explicitly defined (no arbitrary status jumps)
- Role-gated (only certain roles can trigger certain transitions)
- Side-effect-aware (each transition can trigger events, SLA updates, flag changes)
- Audited (every transition is logged)

---

## State Diagram

```
                        ┌──────────────────────────────────────┐
                        │                                      │
                        ▼                                      │
┌─────────┐    ┌───────────┐    ┌──────────────┐    ┌─────────────────┐
│  DRAFT  │───▶│ SUBMITTED │───▶│ UNDER_REVIEW │───▶│ DOCS_REQUIRED   │
│         │    │           │    │              │    │                 │
│ Client  │    │ Client    │    │ CS Staff     │    │ CS Staff        │
│ only    │    │ submits   │    │ picks up     │    │ requests docs   │
└─────────┘    └───────────┘    └──────┬───────┘    └────────┬────────┘
                                       │                      │
                                       │                      │ Client re-submits
                                       │                      │ documents
                                       │                      ▼
                                       │               ┌──────────────┐
                                       │               │ UNDER_REVIEW │ (loops back)
                                       │               └──────────────┘
                                       │
                                       ▼
                                ┌──────────────┐
                                │  PROCESSING  │
                                │              │
                                │ CS Staff     │
                                │ working on   │
                                │ case         │
                                └──────┬───────┘
                                       │
                              ┌────────┴────────┐
                              ▼                 ▼
                       ┌───────────┐    ┌───────────┐
                       │ COMPLETED │    │ REJECTED  │
                       │           │    │           │
                       │ Terminal  │    │ Terminal  │
                       └───────────┘    └───────────┘
```

---

## Transition Matrix

| From | To | Allowed Roles | Side Effects |
|------|-----|--------------|--------------|
| `DRAFT` | `SUBMITTED` | Client (Owner) | Auto-assign employee, set SLA deadline, create chat rooms, emit `case.submitted` |
| `SUBMITTED` | `UNDER_REVIEW` | Employee, Manager, Admin | Emit `case.status.changed` |
| `UNDER_REVIEW` | `DOCS_REQUIRED` | Employee, Manager, Admin | Emit `case.docs.requested`, notify client |
| `UNDER_REVIEW` | `PROCESSING` | Employee, Manager, Admin | Emit `case.status.changed` |
| `UNDER_REVIEW` | `REJECTED` | Manager, Admin | Emit `case.rejected`, notify client |
| `DOCS_REQUIRED` | `UNDER_REVIEW` | Client (re-submits docs) | Emit `case.status.changed`, reset partial SLA |
| `PROCESSING` | `COMPLETED` | Employee, Manager, Admin | Set `completedAt`, emit `case.completed`, notify client |
| `PROCESSING` | `REJECTED` | Manager, Admin | Set `completedAt`, emit `case.rejected`, notify client |
| `PROCESSING` | `DOCS_REQUIRED` | Employee, Manager, Admin | Emit `case.docs.requested` |
| `PROCESSING` | `UNDER_REVIEW` | Manager, Admin | Rollback (rare, audit logged) |

### Transitions NOT Allowed
- `COMPLETED` → anything (terminal)
- `REJECTED` → anything (terminal)
- `DRAFT` → anything except `SUBMITTED`
- `SUBMITTED` → `COMPLETED` (cannot skip review)
- Client → `PROCESSING`, `COMPLETED`, `REJECTED` (CS staff only)

---

## Implementation

### State Machine Definition

```typescript
// modules/case/state-machine/case-state-machine.ts

import { CaseStatus, StaffRole } from '@prisma/client';

interface Transition {
  from: CaseStatus;
  to: CaseStatus;
  allowedRoles: AllowedRole[];
  sideEffects: SideEffect[];
  guard?: (context: TransitionContext) => Promise<boolean>;
}

type AllowedRole = StaffRole | 'CLIENT';

interface TransitionContext {
  caseId: string;
  firmId: string;
  actorId: string;
  actorRole: AllowedRole;
  case_: CaseWithRelations;
  data?: Record<string, any>;
}

type SideEffect =
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

const TRANSITIONS: Transition[] = [
  // DRAFT → SUBMITTED
  {
    from: CaseStatus.DRAFT,
    to: CaseStatus.SUBMITTED,
    allowedRoles: ['CLIENT'],
    sideEffects: [
      'EMIT_SUBMITTED',
      'AUTO_ASSIGN',
      'SET_SLA_DEADLINE',
      'CREATE_CHAT_ROOMS',
    ],
    guard: async (ctx) => {
      // Validate: form data is complete, required docs uploaded
      return validateCaseComplete(ctx.case_);
    },
  },

  // SUBMITTED → UNDER_REVIEW
  {
    from: CaseStatus.SUBMITTED,
    to: CaseStatus.UNDER_REVIEW,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },

  // UNDER_REVIEW → DOCS_REQUIRED
  {
    from: CaseStatus.UNDER_REVIEW,
    to: CaseStatus.DOCS_REQUIRED,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_DOCS_REQUESTED', 'NOTIFY_CLIENT'],
  },

  // UNDER_REVIEW → PROCESSING
  {
    from: CaseStatus.UNDER_REVIEW,
    to: CaseStatus.PROCESSING,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },

  // UNDER_REVIEW → REJECTED
  {
    from: CaseStatus.UNDER_REVIEW,
    to: CaseStatus.REJECTED,
    allowedRoles: [StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_REJECTED', 'SET_COMPLETED_AT', 'NOTIFY_CLIENT'],
  },

  // DOCS_REQUIRED → UNDER_REVIEW (client re-submits)
  {
    from: CaseStatus.DOCS_REQUIRED,
    to: CaseStatus.UNDER_REVIEW,
    allowedRoles: ['CLIENT'],
    sideEffects: ['EMIT_STATUS_CHANGED'],
    guard: async (ctx) => {
      // Validate: new documents have been uploaded
      return hasNewDocuments(ctx.case_, ctx.data?.previousDocCount);
    },
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
  },

  // PROCESSING → DOCS_REQUIRED
  {
    from: CaseStatus.PROCESSING,
    to: CaseStatus.DOCS_REQUIRED,
    allowedRoles: [StaffRole.EMPLOYEE, StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_DOCS_REQUESTED', 'NOTIFY_CLIENT'],
  },

  // PROCESSING → UNDER_REVIEW (rollback)
  {
    from: CaseStatus.PROCESSING,
    to: CaseStatus.UNDER_REVIEW,
    allowedRoles: [StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN],
    sideEffects: ['EMIT_STATUS_CHANGED'],
  },
];

export class CaseStateMachine {

  /**
   * Find the transition definition, or throw if not valid
   */
  static findTransition(
    from: CaseStatus,
    to: CaseStatus,
    actorRole: AllowedRole,
  ): Transition {
    const transition = TRANSITIONS.find(
      (t) => t.from === from && t.to === to,
    );

    if (!transition) {
      throw new BadRequestException(
        `Invalid transition: ${from} → ${to}`,
      );
    }

    if (!transition.allowedRoles.includes(actorRole)) {
      throw new ForbiddenException(
        `Role ${actorRole} cannot perform transition ${from} → ${to}`,
      );
    }

    return transition;
  }

  /**
   * Get all valid next states for a given status and role
   */
  static getAvailableTransitions(
    currentStatus: CaseStatus,
    actorRole: AllowedRole,
  ): CaseStatus[] {
    return TRANSITIONS
      .filter((t) => t.from === currentStatus && t.allowedRoles.includes(actorRole))
      .map((t) => t.to);
  }

  /**
   * Check if a specific transition is valid
   */
  static canTransition(
    from: CaseStatus,
    to: CaseStatus,
    actorRole: AllowedRole,
  ): boolean {
    try {
      this.findTransition(from, to, actorRole);
      return true;
    } catch {
      return false;
    }
  }
}
```

### Transition Executor

```typescript
// modules/case/state-machine/transition-executor.ts

@Injectable()
export class CaseTransitionExecutor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly assignmentService: AssignmentService,
    private readonly chatService: ChatService,
  ) {}

  async execute(
    caseId: string,
    targetStatus: CaseStatus,
    actor: AuthenticatedUser,
    data?: Record<string, any>,
  ): Promise<Case> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Lock the case row (prevent concurrent transitions)
      const case_ = await tx.$queryRaw`
        SELECT * FROM "case" WHERE id = ${caseId}::uuid FOR UPDATE
      `;

      if (!case_[0]) throw new NotFoundException('Case not found');

      const currentCase = case_[0];
      const actorRole = this.resolveActorRole(actor);

      // 2. Validate transition
      const transition = CaseStateMachine.findTransition(
        currentCase.status as CaseStatus,
        targetStatus,
        actorRole,
      );

      // 3. Run guard if defined
      if (transition.guard) {
        const allowed = await transition.guard({
          caseId,
          firmId: actor.firmId,
          actorId: actor.id,
          actorRole,
          case_: currentCase,
          data,
        });
        if (!allowed) {
          throw new BadRequestException(
            'Transition guard failed: prerequisites not met',
          );
        }
      }

      // 4. Build update payload
      const updateData: any = {
        status: targetStatus,
        updatedAt: new Date(),
      };

      // 5. Execute side effects
      for (const effect of transition.sideEffects) {
        switch (effect) {
          case 'SET_COMPLETED_AT':
            updateData.completedAt = new Date();
            break;

          case 'SET_SLA_DEADLINE':
            const service = await tx.serviceTemplate.findUnique({
              where: { id: currentCase.serviceId },
            });
            const slaDays = (service?.slaConfig as any)?.defaultDeadlineDays || 14;
            updateData.slaDeadline = addDays(new Date(), slaDays);
            break;
        }
      }

      // 6. Persist status change
      const updated = await tx.case.update({
        where: { id: caseId },
        data: updateData,
      });

      return { updated, transition, currentCase };
    }).then(async ({ updated, transition, currentCase }) => {
      // 7. Post-transaction side effects (events, async operations)
      for (const effect of transition.sideEffects) {
        switch (effect) {
          case 'AUTO_ASSIGN':
            await this.assignmentService.autoAssign(updated);
            break;

          case 'CREATE_CHAT_ROOMS':
            await this.chatService.createCaseRooms(updated);
            break;

          case 'EMIT_SUBMITTED':
            this.eventEmitter.emit(DomainEvents.CASE_SUBMITTED, {
              eventType: DomainEvents.CASE_SUBMITTED,
              firmId: updated.firmId,
              actorId: actor.id,
              actorRole: actor.role,
              entityType: 'case',
              entityId: updated.id,
              data: { caseNumber: updated.caseNumber, orgId: updated.orgId },
            });
            break;

          case 'EMIT_STATUS_CHANGED':
            this.eventEmitter.emit(DomainEvents.CASE_STATUS_CHANGED, {
              eventType: DomainEvents.CASE_STATUS_CHANGED,
              firmId: updated.firmId,
              actorId: actor.id,
              entityType: 'case',
              entityId: updated.id,
              data: {
                caseNumber: updated.caseNumber,
                previousStatus: currentCase.status,
                newStatus: updated.status,
              },
            });
            break;

          case 'EMIT_COMPLETED':
            this.eventEmitter.emit(DomainEvents.CASE_COMPLETED, {
              eventType: DomainEvents.CASE_COMPLETED,
              firmId: updated.firmId,
              actorId: actor.id,
              entityType: 'case',
              entityId: updated.id,
              data: { caseNumber: updated.caseNumber },
            });
            break;

          case 'EMIT_REJECTED':
            this.eventEmitter.emit(DomainEvents.CASE_REJECTED, {
              eventType: DomainEvents.CASE_REJECTED,
              firmId: updated.firmId,
              actorId: actor.id,
              entityType: 'case',
              entityId: updated.id,
              data: { caseNumber: updated.caseNumber, reason: data?.reason },
            });
            break;

          case 'EMIT_DOCS_REQUESTED':
            this.eventEmitter.emit(DomainEvents.CASE_DOCS_REQUESTED, {
              eventType: DomainEvents.CASE_DOCS_REQUESTED,
              firmId: updated.firmId,
              actorId: actor.id,
              entityType: 'case',
              entityId: updated.id,
              data: {
                caseNumber: updated.caseNumber,
                requestedDocs: data?.requestedDocs,
              },
            });
            break;
        }
      }

      return updated;
    });
  }

  private resolveActorRole(actor: AuthenticatedUser): AllowedRole {
    if (actor.userType === 'CLIENT') return 'CLIENT';
    return actor.staffRole as StaffRole;
  }
}
```

---

## Internal Flags (Orthogonal to Status)

Flags are NOT part of the state machine. They are metadata tags that CS staff can add/remove at any time on active cases.

```typescript
// modules/case/case.service.ts

async addFlag(caseId: string, flag: InternalFlag, actor: AuthenticatedUser) {
  const case_ = await this.prisma.case.findUnique({ where: { id: caseId } });

  if (['COMPLETED', 'REJECTED'].includes(case_.status)) {
    throw new BadRequestException('Cannot add flags to closed cases');
  }

  if (case_.internalFlags.includes(flag)) {
    return case_; // Already flagged, idempotent
  }

  const updated = await this.prisma.case.update({
    where: { id: caseId },
    data: {
      internalFlags: { push: flag },
    },
  });

  this.eventEmitter.emit(DomainEvents.CASE_FLAG_ADDED, {
    firmId: actor.firmId,
    entityType: 'case',
    entityId: caseId,
    data: { flag, caseNumber: case_.caseNumber },
  });

  return updated;
}
```

**Flag Visibility Rule:** Flags are NEVER exposed to client APIs. The client-facing case response DTO strips `internalFlags` entirely:

```typescript
// modules/case/dto/case-response.dto.ts

export class ClientCaseResponseDto {
  id: string;
  caseNumber: string;
  status: CaseStatus;  // ← visible
  // internalFlags: ABSENT — never serialized for client
  priority: CasePriority;
  formData: any;
  submittedAt: Date;
  createdAt: Date;
}

export class StaffCaseResponseDto extends ClientCaseResponseDto {
  internalFlags: InternalFlag[];  // ← only for CS staff
  assignedTo: EmployeeProfileDto;
  slaDeadline: Date;
  slaBreached: boolean;
}
```

---

## Case Number Generation

```typescript
// modules/case/case.service.ts

async generateCaseNumber(firmId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = 'CS';

  // Atomic counter per firm per year
  const counterKey = `case_counter:${firmId}:${year}`;
  const counter = await this.redis.incr(counterKey);

  // Set expiry if this is the first case of the year
  if (counter === 1) {
    await this.redis.expire(counterKey, 366 * 24 * 60 * 60); // ~1 year
  }

  return `${prefix}-${year}-${String(counter).padStart(5, '0')}`;
  // Example: CS-2026-00001
}
```

---

## API Endpoints

```
POST   /cases                              → Create draft case
PATCH  /cases/:id/submit                   → Submit (DRAFT → SUBMITTED)
PATCH  /cases/:id/status                   → Change status (body: { status, reason? })
GET    /cases/:id/transitions              → Get available transitions for current user
PATCH  /cases/:id/flags                    → Add/remove internal flag
POST   /cases/:id/transfer                 → Transfer to another employee
GET    /cases/:id                          → Get case details
GET    /cases                              → List cases (filtered, paginated)
```

The `/cases/:id/transitions` endpoint is critical for the frontend — it tells the UI which status buttons to show:

```typescript
// GET /cases/:id/transitions
{
  "data": {
    "currentStatus": "UNDER_REVIEW",
    "availableTransitions": [
      { "to": "DOCS_REQUIRED", "label": "Request Documents" },
      { "to": "PROCESSING", "label": "Start Processing" },
      { "to": "REJECTED", "label": "Reject Case" }
    ]
  }
}
```
