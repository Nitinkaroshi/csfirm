# 08 — Auto-Assignment Algorithm Design

## Overview

When a case is submitted (`DRAFT → SUBMITTED`), the system auto-assigns it to a CS firm employee. Phase 1 uses a rule-based weighted scoring algorithm. Phase 2 adds ML-based smart assignment.

---

## Assignment Strategy: Weighted Round-Robin with Specialization

The algorithm does NOT simply pick the least-loaded employee. It scores candidates across multiple dimensions and picks the highest scorer.

---

## Algorithm Flow

```
Case Submitted
    │
    ▼
┌─────────────────────────────┐
│  1. Build Candidate Pool    │
│     - Same firm (firm_id)   │
│     - Role: EMPLOYEE+       │
│     - isAvailable = true    │
│     - activeCases < maxCases│
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  2. Score Each Candidate    │
│     - Specialization match  │
│     - Workload balance      │
│     - Recent assignment gap │
│     - Client history        │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  3. Select Top Scorer       │
│     Tie-break: longest      │
│     since last assignment   │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│  4. Assign                  │
│     - Update case           │
│     - Increment activeCases │
│     - Emit event            │
└─────────────────────────────┘
               │
               ▼
        ┌──────┴──────┐
        │ Fallback:   │
        │ No eligible │
        │ candidates? │
        └──────┬──────┘
               │
               ▼
┌─────────────────────────────┐
│  5. Fallback Queue          │
│     - Assign to Manager     │
│     - Flag as unassigned    │
│     - Notify Admin          │
└─────────────────────────────┘
```

---

## Scoring Dimensions

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Specialization Match | 40% | Does the employee specialize in this service category? |
| Workload Balance | 30% | How much capacity does the employee have? |
| Assignment Recency | 15% | When was the employee last assigned a case? (round-robin fairness) |
| Client History | 15% | Has this employee handled cases for this client org before? (continuity) |

### Scoring Functions

```typescript
// modules/case/assignment/assignment.strategy.ts

interface ScoredCandidate {
  employee: EmployeeProfile;
  score: number;
  breakdown: {
    specialization: number;
    workload: number;
    recency: number;
    clientHistory: number;
  };
}

@Injectable()
export class AssignmentStrategy {

  /**
   * Specialization Score (0 - 100)
   *
   * If the employee has the service's category in their specializations array,
   * they get 100. Otherwise 0.
   *
   * Phase 2: Partial matches, sub-category scoring
   */
  scoreSpecialization(
    employee: EmployeeProfile,
    serviceCategory: string,
  ): number {
    if (employee.specializations.includes(serviceCategory)) {
      return 100;
    }
    // Generalists (empty specializations) get a mid score — they handle anything
    if (employee.specializations.length === 0) {
      return 50;
    }
    return 0;
  }

  /**
   * Workload Score (0 - 100)
   *
   * Linear inverse of utilization.
   * Employee at 0% capacity → score = 100
   * Employee at 100% capacity → score = 0
   */
  scoreWorkload(employee: EmployeeProfile): number {
    if (employee.maxCases === 0) return 0;
    const utilization = employee.activeCases / employee.maxCases;
    return Math.max(0, Math.round((1 - utilization) * 100));
  }

  /**
   * Recency Score (0 - 100)
   *
   * How long since this employee was last assigned a case?
   * Longer gap = higher score (round-robin fairness)
   */
  scoreRecency(
    lastAssignedAt: Date | null,
    now: Date,
  ): number {
    if (!lastAssignedAt) return 100; // Never assigned — highest priority

    const hoursSinceLastAssignment = differenceInHours(now, lastAssignedAt);

    // Cap at 48 hours — beyond that, all long-idle employees score equally
    const cappedHours = Math.min(hoursSinceLastAssignment, 48);
    return Math.round((cappedHours / 48) * 100);
  }

  /**
   * Client History Score (0 - 100)
   *
   * Has this employee handled cases for this organization before?
   * Yes → 100 (continuity is valuable)
   * No → 30 (fresh perspective, but less context)
   */
  scoreClientHistory(
    previousCasesForOrg: number,
  ): number {
    if (previousCasesForOrg > 0) return 100;
    return 30;
  }
}
```

---

## Full Assignment Service

```typescript
// modules/case/assignment/assignment.service.ts

@Injectable()
export class AssignmentService {
  private readonly WEIGHTS = {
    specialization: 0.40,
    workload: 0.30,
    recency: 0.15,
    clientHistory: 0.15,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly strategy: AssignmentStrategy,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async autoAssign(case_: Case): Promise<EmployeeProfile | null> {
    // Use distributed lock to prevent double-assignment race conditions
    const lockKey = `assignment_lock:${case_.firmId}`;
    const lock = await this.redis.set(lockKey, '1', 'EX', 10, 'NX');
    if (!lock) {
      // Another assignment is in progress — retry after short delay
      await sleep(100);
      return this.autoAssign(case_);
    }

    try {
      // 1. Get service category
      const service = await this.prisma.serviceTemplate.findUnique({
        where: { id: case_.serviceId },
        select: { category: true },
      });

      // 2. Build candidate pool
      const candidates = await this.prisma.employeeProfile.findMany({
        where: {
          firmId: case_.firmId,
          isAvailable: true,
          role: { in: ['EMPLOYEE', 'MANAGER'] },
          activeCases: { lt: this.prisma.employeeProfile.fields.maxCases },
        },
        include: { user: true },
      });

      // Filter candidates where activeCases < maxCases (Prisma doesn't support field comparison directly)
      const eligibleCandidates = candidates.filter(
        (c) => c.activeCases < c.maxCases,
      );

      if (eligibleCandidates.length === 0) {
        await this.handleNoCandidates(case_);
        return null;
      }

      // 3. Score each candidate
      const now = new Date();
      const scoredCandidates: ScoredCandidate[] = await Promise.all(
        eligibleCandidates.map(async (employee) => {
          // Get last assignment time
          const lastAssigned = await this.prisma.case.findFirst({
            where: {
              firmId: case_.firmId,
              assignedToId: employee.id,
            },
            orderBy: { createdAt: 'desc' },
            select: { createdAt: true },
          });

          // Get previous cases for this org
          const orgCaseCount = await this.prisma.case.count({
            where: {
              firmId: case_.firmId,
              assignedToId: employee.id,
              orgId: case_.orgId,
            },
          });

          const breakdown = {
            specialization: this.strategy.scoreSpecialization(
              employee,
              service.category,
            ),
            workload: this.strategy.scoreWorkload(employee),
            recency: this.strategy.scoreRecency(
              lastAssigned?.createdAt || null,
              now,
            ),
            clientHistory: this.strategy.scoreClientHistory(orgCaseCount),
          };

          const score =
            breakdown.specialization * this.WEIGHTS.specialization +
            breakdown.workload * this.WEIGHTS.workload +
            breakdown.recency * this.WEIGHTS.recency +
            breakdown.clientHistory * this.WEIGHTS.clientHistory;

          return { employee, score, breakdown };
        }),
      );

      // 4. Sort by score (descending), tie-break by recency
      scoredCandidates.sort((a, b) => {
        if (Math.abs(a.score - b.score) < 0.01) {
          // Tie-break: prefer the one idle longest
          return b.breakdown.recency - a.breakdown.recency;
        }
        return b.score - a.score;
      });

      const selected = scoredCandidates[0].employee;

      // 5. Assign
      await this.prisma.$transaction([
        this.prisma.case.update({
          where: { id: case_.id },
          data: { assignedToId: selected.id },
        }),
        this.prisma.employeeProfile.update({
          where: { id: selected.id },
          data: { activeCases: { increment: 1 } },
        }),
      ]);

      // 6. Emit event
      this.eventEmitter.emit(DomainEvents.CASE_ASSIGNED, {
        eventType: DomainEvents.CASE_ASSIGNED,
        firmId: case_.firmId,
        entityType: 'case',
        entityId: case_.id,
        data: {
          caseNumber: case_.caseNumber,
          assignedToId: selected.id,
          assignedToName: `${selected.user.firstName} ${selected.user.lastName}`,
          score: scoredCandidates[0].score,
          breakdown: scoredCandidates[0].breakdown,
        },
      });

      return selected;
    } finally {
      await this.redis.del(lockKey);
    }
  }

  /**
   * Fallback when no candidates are eligible
   */
  private async handleNoCandidates(case_: Case): Promise<void> {
    // Find the first available manager/admin
    const fallback = await this.prisma.employeeProfile.findFirst({
      where: {
        firmId: case_.firmId,
        role: { in: ['MANAGER', 'ADMIN', 'MASTER_ADMIN'] },
        isAvailable: true,
      },
      orderBy: { activeCases: 'asc' },
    });

    if (fallback) {
      await this.prisma.case.update({
        where: { id: case_.id },
        data: {
          assignedToId: fallback.id,
          internalFlags: { push: 'COMPLIANCE_RISK' },  // Flag for attention
        },
      });

      await this.prisma.employeeProfile.update({
        where: { id: fallback.id },
        data: { activeCases: { increment: 1 } },
      });
    }

    // Notify admins regardless
    this.eventEmitter.emit(DomainEvents.CASE_ESCALATED, {
      eventType: DomainEvents.CASE_ESCALATED,
      firmId: case_.firmId,
      entityType: 'case',
      entityId: case_.id,
      data: {
        caseNumber: case_.caseNumber,
        reason: 'No eligible employees for auto-assignment',
        assignedToFallback: fallback?.id || null,
      },
    });
  }

  /**
   * Manual reassignment — when a case is transferred
   */
  async transferCase(
    caseId: string,
    toEmployeeId: string,
    reason: string,
    actor: AuthenticatedUser,
  ): Promise<Case> {
    const case_ = await this.prisma.case.findUnique({
      where: { id: caseId },
      select: { id: true, firmId: true, assignedToId: true, caseNumber: true },
    });

    if (!case_) throw new NotFoundException('Case not found');
    if (!case_.assignedToId) throw new BadRequestException('Case is not assigned');

    const fromEmployeeId = case_.assignedToId;
    if (fromEmployeeId === toEmployeeId) {
      throw new BadRequestException('Cannot transfer to the same employee');
    }

    // Validate target employee exists and is eligible
    const toEmployee = await this.prisma.employeeProfile.findUnique({
      where: { id: toEmployeeId },
    });
    if (!toEmployee || toEmployee.firmId !== case_.firmId) {
      throw new NotFoundException('Target employee not found');
    }
    if (!toEmployee.isAvailable) {
      throw new BadRequestException('Target employee is not available');
    }
    if (toEmployee.activeCases >= toEmployee.maxCases) {
      throw new BadRequestException('Target employee has reached max case load');
    }

    // Execute transfer in transaction
    const [updated] = await this.prisma.$transaction([
      this.prisma.case.update({
        where: { id: caseId },
        data: { assignedToId: toEmployeeId },
      }),
      this.prisma.employeeProfile.update({
        where: { id: fromEmployeeId },
        data: { activeCases: { decrement: 1 } },
      }),
      this.prisma.employeeProfile.update({
        where: { id: toEmployeeId },
        data: { activeCases: { increment: 1 } },
      }),
      this.prisma.caseTransferLog.create({
        data: {
          firmId: case_.firmId,
          caseId: caseId,
          fromEmployeeId,
          toEmployeeId,
          transferredBy: actor.id,
          reason,
        },
      }),
    ]);

    // Emit transfer event
    this.eventEmitter.emit(DomainEvents.CASE_TRANSFERRED, {
      eventType: DomainEvents.CASE_TRANSFERRED,
      firmId: case_.firmId,
      actorId: actor.id,
      entityType: 'case',
      entityId: caseId,
      data: {
        caseNumber: case_.caseNumber,
        fromEmployeeId,
        toEmployeeId,
        reason,
      },
    });

    return updated;
  }
}
```

---

## Active Case Counter Consistency

The `activeCases` field on `EmployeeProfile` is a denormalized counter. To prevent drift:

```typescript
// Recurring job: reconcile active case counts (daily)
// apps/worker/src/processors/cleanup.processor.ts

@Process('reconcile-case-counts')
async reconcileCaseCounts() {
  const employees = await this.prisma.employeeProfile.findMany({
    select: { id: true, firmId: true },
  });

  for (const emp of employees) {
    const actualCount = await this.prisma.case.count({
      where: {
        assignedToId: emp.id,
        status: { notIn: ['COMPLETED', 'REJECTED'] },
      },
    });

    await this.prisma.employeeProfile.update({
      where: { id: emp.id },
      data: { activeCases: actualCount },
    });
  }
}
```

---

## Phase 2: ML-Enhanced Assignment

In Phase 2, the FastAPI AI microservice can provide a "compatibility score" based on:
- Historical case completion times per employee per service type
- Client satisfaction signals
- Employee expertise depth (from case outcome data)

The API contract:

```
POST /api/ai/assignment-score
{
  "candidateIds": ["emp-1", "emp-2", "emp-3"],
  "caseContext": {
    "serviceCategory": "annual_compliance",
    "orgId": "org-123",
    "complexity": "medium"
  }
}

→ Response:
{
  "scores": {
    "emp-1": 0.85,
    "emp-2": 0.72,
    "emp-3": 0.91
  }
}
```

This score would replace or augment the `specialization` and `clientHistory` dimensions in the weighted scoring.

---

## Configuration Per Firm

Firms can customize assignment behavior via `firm.settings`:

```json
{
  "assignment": {
    "strategy": "weighted_round_robin",  // or "manual" to disable auto-assign
    "weights": {
      "specialization": 0.40,
      "workload": 0.30,
      "recency": 0.15,
      "clientHistory": 0.15
    },
    "fallbackToManager": true,
    "maxRetries": 1
  }
}
```

If `strategy: "manual"`, the case remains unassigned after submission and admins/managers must manually assign it.
