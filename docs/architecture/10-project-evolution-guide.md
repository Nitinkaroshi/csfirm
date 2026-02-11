# 10 — Project Evolution Guide: Avoiding Future Rewrites

## Principle: Build for Change, Not for Permanence

Every architecture decision in this document was made to minimize the blast radius of change. Here's what that means concretely and how to maintain it.

---

## 1. The Modular Monolith Extraction Path

### Current: Single NestJS process with module boundaries
### Future: Extract modules into independent services

**How we've prepared:**

```
Phase 1 (Now):
┌──────────────────────────────────────┐
│           NestJS Process              │
│  ┌──────┐ ┌──────┐ ┌──────────────┐ │
│  │ Case │ │ Chat │ │ Notification │ │
│  └──┬───┘ └──┬───┘ └──────┬───────┘ │
│     │ events  │ events     │          │
│     └─────────┴────────────┘          │
│        EventEmitter2 (in-process)     │
└──────────────────────────────────────┘

Phase 2 (When scale demands):
┌──────────┐    ┌──────────┐    ┌──────────────┐
│ Case API │    │ Chat API │    │ Notification │
│          │    │          │    │ Service      │
└────┬─────┘    └────┬─────┘    └──────┬───────┘
     │ events        │ events          │
     └───────────────┴─────────────────┘
          Redis Streams / RabbitMQ
          (Replace EventEmitter2)
```

**What makes this extraction clean:**
1. Modules communicate via events, not direct method calls
2. Each module has its own service layer — no cross-module Prisma queries
3. DTOs are in `@csfirm/shared-types` package — already shareable
4. Database models are logically grouped per module even though they're in one schema

**When to extract a module:**
- When it needs to scale independently (e.g., Chat at 10K concurrent WebSocket connections)
- When it needs a different runtime (e.g., AI service in Python)
- When deployment frequency diverges (Notification rules change weekly, Case logic monthly)

**Never extract prematurely.** The overhead of distributed transactions, network failures, and deployment complexity is enormous. Only extract when the pain of staying monolithic exceeds the pain of going distributed.

---

## 2. Database Schema Evolution Rules

### Rule 1: Additive Changes Only (Phase 1)
```
SAFE:
✅ Add a new table
✅ Add a new column (nullable or with default)
✅ Add a new index
✅ Add a new enum value

UNSAFE (requires two-phase deploy):
⚠️ Rename a column
⚠️ Change a column type
⚠️ Drop a column
⚠️ Drop a table

FORBIDDEN in production:
🚫 DROP TABLE without data migration plan
🚫 ALTER COLUMN that narrows type
🚫 Remove enum values
```

### Rule 2: JSONB is Your Escape Hatch (But Not Your Crutch)

We use JSONB for:
- `formSchema` — dynamic form definitions (inherently schemaless)
- `formData` — case form submissions (varies per service)
- `settings` — firm-level configuration (extensible without migrations)
- `metadata` — catch-all for non-queryable data

We do NOT use JSONB for:
- Data that needs to be queried/filtered frequently → use proper columns
- Data that needs referential integrity → use foreign keys
- Data that needs indexing → use columns (JSONB GIN indexes are a last resort)

### Rule 3: Version Your Service Templates

When a service template is modified, cases created from it retain the **snapshot** of the schema at creation time. This prevents retroactive breakage:

```typescript
// When creating a case
const case_ = await prisma.case.create({
  data: {
    serviceId: service.id,
    formData: submittedData,
    // Store schema version for reference
    metadata: { serviceVersion: service.version },
  },
});
```

---

## 3. API Versioning Strategy

### Phase 1: No versioning (v1 implicit)
All endpoints are `/api/cases`, `/api/documents`, etc.

### When versioning becomes necessary:
```
/api/v1/cases     ← legacy clients
/api/v2/cases     ← new clients with breaking changes
```

**Rules:**
- Version at the API gateway (Nginx), not in NestJS controllers
- Never break v1 while v2 is in development
- Sunset v1 with 6-month deprecation notice
- Version the API, not individual endpoints

### How to prepare now:
- All DTOs are in `@csfirm/shared-types` — versioned DTOs are easy to add
- Response envelope includes `meta.apiVersion` field
- No business logic in controllers — versioning only changes serialization

---

## 4. Feature Flags (Phase 2)

When you need to ship incomplete features to production:

```typescript
// Simple approach: firm.settings
{
  "features": {
    "ai_assignment": false,
    "whatsapp_notifications": false,
    "advanced_billing": false,
    "bulk_case_operations": true
  }
}
```

```typescript
// Guard decorator
@UseGuards(FeatureFlagGuard)
@FeatureFlag('ai_assignment')
@Post('cases/:id/ai-assign')
async aiAssign() { /* ... */ }
```

**Do NOT use feature flags for Phase 1.** They add complexity. Only introduce when you have features that need gradual rollout.

---

## 5. What Will Change (and How to Be Ready)

### Multi-Organization Client Access (Confirmed Future)

Current: One user → one org.
Future: One user → many orgs.

**We're ready because:**
- `OrgUser` is already a junction table (user ↔ org = many-to-many)
- Case access is checked via `OrgUser` membership, not user-level org field
- JWT payload includes `orgId` but the system checks membership at query time

**Migration path:** Add org-switching UI. Backend already supports it.

### AI Microservice (Phase 2)

Current: No AI.
Future: FastAPI service for document classification, smart assignment, compliance checking.

**We're ready because:**
- Assignment service uses a strategy pattern — plug in AI scorer alongside rule-based scorer
- Document pipeline has clear hooks for classification (post-upload event)
- Events are the integration point — AI service consumes events from Redis/BullMQ

**Integration:**
```
NestJS → BullMQ job → AI Worker (FastAPI) → Result → BullMQ response → NestJS handler
```

### Payment Gateway Integration (Phase 2+)

Current: Invoice is a record, no payment processing.
Future: Razorpay/Stripe integration.

**We're ready because:**
- Invoice model has `status` field with state machine
- Payment processing adds: `payment_id`, `gateway_response`, `payment_method` columns
- Webhook handler is a new controller — no existing code changes
- Invoice → Payment is a 1:1 or 1:many extension

### WhatsApp / Push Notifications (Phase 2)

**We're ready because:**
- Notification system is channel-agnostic
- Adding WhatsApp = new Channel class implementing `NotificationChannelInterface`
- BullMQ processor routes to correct channel based on job name
- Zero changes to any business module

---

## 6. Code Organization Patterns That Prevent Rot

### Pattern 1: Service Layer Owns Business Logic, Controllers Are Thin

```typescript
// BAD — business logic in controller
@Post('cases/:id/submit')
async submitCase(@Param('id') id: string) {
  const case_ = await this.prisma.case.findUnique({ where: { id } });
  if (case_.status !== 'DRAFT') throw new BadRequestException();
  // ... 50 lines of business logic
}

// GOOD — controller delegates, service owns logic
@Post('cases/:id/submit')
async submitCase(@Param('id') id: string, @CurrentUser() user) {
  return this.caseService.submitCase(id, user);
}
```

### Pattern 2: Events Over Direct Coupling

```typescript
// BAD — CaseService directly calls NotificationService
@Injectable()
export class CaseService {
  constructor(private notificationService: NotificationService) {} // tight coupling
}

// GOOD — CaseService emits event, NotificationModule reacts
@Injectable()
export class CaseService {
  constructor(private eventEmitter: EventEmitter2) {} // no coupling
}
```

### Pattern 3: Repository Pattern for Data Access

```typescript
// BAD — Prisma calls scattered across service methods
async getActiveCases(firmId: string) {
  return this.prisma.case.findMany({
    where: { firmId, status: { notIn: ['COMPLETED', 'REJECTED'] } },
    include: { assignedTo: { include: { user: true } } },
  });
}

// GOOD — Repository encapsulates queries
@Injectable()
export class CaseRepository {
  constructor(private prisma: PrismaService) {}

  async findActive(firmId: string): Promise<CaseWithAssignee[]> {
    return this.prisma.case.findMany({
      where: { firmId, status: { notIn: ['COMPLETED', 'REJECTED'] } },
      include: { assignedTo: { include: { user: true } } },
    });
  }
}
```

### Pattern 4: Consistent Error Handling

```typescript
// Define domain-specific exception classes
export class CaseInvalidTransitionException extends BadRequestException {
  constructor(from: string, to: string) {
    super({
      code: 'CASE_INVALID_TRANSITION',
      message: `Cannot transition from ${from} to ${to}`,
    });
  }
}

export class CaseNotAssignedException extends BadRequestException {
  constructor(caseNumber: string) {
    super({
      code: 'CASE_NOT_ASSIGNED',
      message: `Case ${caseNumber} is not assigned to any employee`,
    });
  }
}
```

---

## 7. Testing Strategy

### Test Pyramid

```
           ┌───────┐
           │  E2E  │  ← 10% — Critical user flows only
           │ Tests │     (submit case, vault access, chat)
          ┌┴───────┴┐
          │Integration│ ← 30% — Module-level with real DB
          │  Tests    │    (case state machine, assignment, auth)
         ┌┴──────────┴┐
         │   Unit      │ ← 60% — Service logic, validators, utils
         │   Tests     │    (state machine rules, scoring, DTOs)
         └─────────────┘
```

### What to Test

| Layer | What | How |
|-------|------|-----|
| State machine | Every valid transition | Unit test |
| State machine | Every invalid transition blocked | Unit test |
| Assignment algorithm | Scoring correctness | Unit test |
| Assignment algorithm | Tie-breaking | Unit test |
| Assignment algorithm | No candidates fallback | Unit test |
| Tenant isolation | Cross-tenant query blocked | Integration test |
| Auth | Token refresh rotation | Integration test |
| Auth | Reuse detection | Integration test |
| Vault | Unlock → access → auto-lock | Integration test |
| Chat | Client cannot see internal room | Integration test |
| Case lifecycle | Draft → Submit → Review → Complete | E2E test |

### Testing Tenant Isolation

```typescript
// Critical test: ensure tenant middleware prevents cross-tenant access
describe('Tenant Isolation', () => {
  it('should not return cases from other tenants', async () => {
    // Setup: Create case for Firm A
    const firmA = await createFirm('Firm A');
    const caseA = await createCase(firmA.id);

    // Act: Query as Firm B
    const firmB = await createFirm('Firm B');
    const token = await loginAs(firmB.masterAdmin);

    const response = await request(app)
      .get('/api/cases')
      .set('Authorization', `Bearer ${token}`);

    // Assert: Firm B sees zero cases
    expect(response.body.data).toHaveLength(0);
    // Extra safety: ensure case A's ID is NOT in results
    expect(response.body.data.map(c => c.id)).not.toContain(caseA.id);
  });
});
```

---

## 8. Monitoring & Observability (Phase 1 Essentials)

### Structured Logging

```typescript
// Every log line includes:
{
  "level": "info",
  "message": "Case status changed",
  "requestId": "uuid",
  "firmId": "uuid",
  "userId": "uuid",
  "caseId": "uuid",
  "fromStatus": "UNDER_REVIEW",
  "toStatus": "PROCESSING",
  "timestamp": "2026-02-09T10:30:00Z",
  "duration_ms": 45
}
```

### Key Metrics to Track (Day 1)

| Metric | Why |
|--------|-----|
| API response time (P50, P95, P99) | Performance SLA |
| Error rate by endpoint | Early warning |
| Active cases per firm | Capacity planning |
| BullMQ queue depth | Worker scaling trigger |
| Vault unlock attempts (failed) | Security monitoring |
| Database connection pool utilization | Scaling trigger |
| Redis memory usage | Cache eviction risk |

---

## 9. Migration Path Summary

| Feature | Phase 1 | Phase 2 | What Changes |
|---------|---------|---------|-------------|
| Assignment | Rule-based scoring | + AI scoring | Add AI scorer strategy, weight it in |
| Notifications | Email + In-app | + WhatsApp + Push | Add channel classes |
| Billing | Invoice records | + Payment gateway | Add payment columns, webhook handler |
| Multi-org | 1 user → 1 org | 1 user → N orgs | UI change only (backend ready) |
| Auth | Password | + MFA/TOTP | Add MFA challenge step |
| AI | None | FastAPI microservice | New service, integrate via BullMQ |
| Deployment | Docker Compose | Kubernetes | Dockerfiles already exist |
| Search | Prisma queries | + Elasticsearch | Add search service, index via events |

**The key pattern:** Every Phase 2 feature is an **addition**, not a **rewrite**. The Phase 1 architecture creates clean extension points at every boundary.
