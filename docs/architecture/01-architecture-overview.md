# 01 — High-Level Architecture Overview

## Architecture Style: Modular Monolith → Extractable Microservices

This is NOT a microservices-first architecture. It is a **modular monolith** designed with explicit module boundaries so any module can be extracted into a standalone service when scale demands it.

**Why modular monolith?**
- Microservices-first for a team building v1 is engineering suicide
- You get deployment simplicity, single transaction scope, and easy debugging
- Module boundaries enforce the same discipline as microservices without the operational cost
- When a module (e.g., Notifications) needs independent scaling, extract it — the boundaries are already clean

---

## System Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                       │
│   Next.js App (SSR + CSR)          Mobile App (Phase 3)              │
│   ┌─────────────────────┐          ┌─────────────────────┐          │
│   │  App Router (RSC)   │          │  React Native       │          │
│   │  Zustand State      │          │  (Future)           │          │
│   │  TanStack Query     │          │                     │          │
│   └────────┬────────────┘          └─────────┬───────────┘          │
└────────────┼────────────────────────────────────────────────────────┘
             │ HTTPS                            │
             ▼                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     NGINX REVERSE PROXY                              │
│   - SSL termination                                                  │
│   - Rate limiting (per IP + per tenant)                              │
│   - Request size limits                                              │
│   - WebSocket upgrade handling                                       │
│   - Static asset caching                                             │
│   - Tenant subdomain routing (firm1.csfirm.com)                      │
└────────────┬────────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              NESTJS APPLICATION (Modular Monolith)                    │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  Auth    │ │  Tenant  │ │  Service │ │  Case    │               │
│  │  Module  │ │  Module  │ │  Builder │ │  Module  │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐               │
│  │  Chat    │ │  Vault   │ │  Billing │ │Notifica- │               │
│  │  Module  │ │  Module  │ │  Module  │ │  tion    │               │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘               │
│                                                                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐                │
│  │  Audit   │ │  Admin   │ │  Shared/Common       │                │
│  │  Module  │ │  Module  │ │  (Guards, Pipes, etc) │                │
│  └──────────┘ └──────────┘ └──────────────────────┘                │
│                                                                       │
│  Cross-Cutting:                                                       │
│  ├── TenantContext (cls-hooked async local storage)                   │
│  ├── RBAC Guard Chain                                                 │
│  ├── Audit Interceptor (automatic mutation logging)                   │
│  ├── Request Validation Pipe (class-validator)                        │
│  └── Exception Filter (structured error responses)                    │
│                                                                       │
└──────┬──────────┬──────────┬──────────┬─────────────────────────────┘
       │          │          │          │
       ▼          ▼          ▼          ▼
┌───────────┐ ┌────────┐ ┌────────┐ ┌────────────────┐
│PostgreSQL │ │ Redis  │ │BullMQ  │ │ AWS S3         │
│           │ │        │ │Workers │ │ (Document Vault)│
│ - Tenants │ │-Session│ │        │ │                │
│ - Cases   │ │-Cache  │ │-Notif  │ │ - Private      │
│ - Users   │ │-PubSub │ │-Email  │ │ - Signed URLs  │
│ - Audit   │ │-Locks  │ │-Cleanup│ │ - Lifecycle    │
│           │ │-Rate   │ │-SLA    │ │   Rules        │
└───────────┘ └────────┘ └────────┘ └────────────────┘
                                           │
                                     ┌─────┴─────┐
                                     │ Phase 2   │
                                     │ FastAPI   │
                                     │ AI Service│
                                     └───────────┘
```

---

## Multi-Tenancy Strategy

### Approach: **Shared Database, Shared Schema, Row-Level Isolation**

Every table that is tenant-scoped has a `firm_id` column. All queries are automatically scoped via Prisma middleware.

**Why NOT schema-per-tenant or database-per-tenant?**
- Schema-per-tenant: Prisma does not support dynamic schema switching cleanly. Migration hell at 1000+ tenants.
- Database-per-tenant: Connection pool exhaustion, operational nightmare, no cross-tenant analytics.
- Row-level isolation: Simple, proven, scales to millions of rows with proper indexing, supports cross-tenant analytics for platform admin.

**Isolation guarantee:**
```
Every request → Extract firm_id from JWT → Inject into Prisma middleware → All queries auto-filtered
```

This is enforced at the ORM level, NOT at the controller level. A developer cannot accidentally query another tenant's data.

---

## Request Lifecycle

```
Client Request
    │
    ▼
Nginx (SSL, rate limit, routing)
    │
    ▼
NestJS Global Middleware
    ├── RequestId (correlation ID for tracing)
    ├── TenantExtractor (JWT → firm_id → AsyncLocalStorage)
    └── RequestLogger (structured JSON logs)
    │
    ▼
NestJS Guard Chain
    ├── AuthGuard (JWT validation, token rotation check)
    ├── TenantGuard (firm_id exists and is active)
    ├── RBACGuard (role + permission check)
    └── VaultGuard (optional — for sensitive document access)
    │
    ▼
Validation Pipe (class-validator + class-transformer)
    │
    ▼
Controller → Service → Repository (Prisma)
    │
    ▼
Interceptors (outbound)
    ├── AuditInterceptor (log mutations automatically)
    ├── ResponseTransformer (consistent API envelope)
    └── PerformanceInterceptor (log slow queries)
    │
    ▼
Exception Filter (catch-all, structured error response)
    │
    ▼
Client Response
```

---

## Data Flow Patterns

### Command Flow (Mutations)
```
Controller
  → Validate DTO
    → Service (business logic + state machine check)
      → Prisma Transaction (DB write)
        → EventEmitter.emit('case.status.changed', payload)
          → AuditInterceptor captures before/after
          → NotificationListener picks up event
            → BullMQ job queued
              → Worker sends email/in-app/push
```

### Query Flow (Reads)
```
Controller
  → Service (apply tenant filter automatically)
    → Redis Cache Check
      → HIT: Return cached
      → MISS: Prisma Query → Cache → Return
```

### Real-Time Flow (Chat + Notifications)
```
Socket.io Connection
  → AuthMiddleware (validate JWT on handshake)
    → TenantMiddleware (extract firm_id)
      → Join rooms: firm:{id}, case:{id}, user:{id}
        → Message → Validate → Persist → Broadcast to room
          → Redis PubSub (for multi-instance scaling)
```

---

## Key Architectural Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Monolith vs Micro | Modular Monolith | Team velocity, transaction safety, extract later |
| Multi-tenancy | Shared DB, row isolation | Prisma-friendly, scalable, simple ops |
| State management | Server-authoritative | Case state machine runs on backend only |
| Real-time | Socket.io + Redis adapter | Multi-instance broadcast, room-based isolation |
| Job queue | BullMQ | Redis-backed, TypeScript native, reliable |
| File storage | S3 + signed URLs | Never proxy files through app server |
| Caching | Redis with tenant-prefixed keys | `cache:{firm_id}:{entity}:{id}` |
| Auth | JWT (short-lived) + Refresh Token (DB-stored) | Stateless auth, revocable sessions |
| API style | REST (Phase 1), GraphQL (evaluate Phase 2) | REST is simpler, sufficient for CRUD-heavy ops |
| Form engine | JSON Schema stored in DB | Service templates are data, not code |

---

## Deployment Topology (Docker Compose → K8s)

```yaml
# Phase 1: Docker Compose
services:
  nginx:        # Reverse proxy + SSL
  api:          # NestJS application (2+ replicas)
  worker:       # BullMQ worker (separate process, same codebase)
  web:          # Next.js frontend
  postgres:     # PostgreSQL 16
  redis:        # Redis 7 (sessions, cache, pubsub, bullmq)
  # Phase 2 additions:
  ai-service:   # FastAPI AI microservice
```

**Critical:** The BullMQ worker runs as a **separate process** from the API. Same codebase, different entrypoint. This prevents job processing from blocking API responses.

---

## Module Communication Rules

1. **Modules communicate via NestJS EventEmitter (in-process) or BullMQ (async)**
2. **No direct cross-module Prisma queries** — modules expose service methods
3. **Shared module provides**: base DTOs, decorators, guards, pipes, interfaces
4. **Each module owns its Prisma models** — but all live in one schema file (Prisma limitation)
5. **Domain events are the integration boundary** — when Module A needs to trigger Module B, it emits an event

```
CaseModule                    NotificationModule
    │                              │
    ├── case.service.ts            ├── notification.listener.ts
    │   emit('case.submitted')  ──►│   @OnEvent('case.submitted')
    │                              │   → queue notification job
    │                              │
    └──────────────────────────────└──
```

This pattern means:
- CaseModule has ZERO knowledge of NotificationModule
- NotificationModule has ZERO knowledge of how cases work
- Adding a new reaction to "case submitted" = adding a new listener, no case code touched
