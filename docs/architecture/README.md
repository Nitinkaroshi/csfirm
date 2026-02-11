# CSFIRM Platform — Architecture Documentation

## Document Index

| # | Document | Description |
|---|----------|-------------|
| 0 | [Requirements](../requirements.md) | Full system requirements specification |
| 1 | [Architecture Overview](01-architecture-overview.md) | High-level system topology, modular monolith design, request lifecycle |
| 2 | [Database Design](02-database-design.md) | Multi-tenant PostgreSQL schema, table designs, indexing strategy |
| 3 | [Prisma Schema](03-prisma-schema.md) | Complete Prisma models, enums, JSON schema structures |
| 4 | [NestJS Module Structure](04-nestjs-module-structure.md) | Full folder structure for API, worker, frontend |
| 5 | [Event & Notification Architecture](05-event-notification-architecture.md) | Domain events, rule engine, BullMQ async delivery |
| 6 | [Vault Access Design](06-vault-access-design.md) | Two-tier document security, vault sessions, S3 integration |
| 7 | [Case State Machine](07-case-state-machine.md) | FSM transitions, role gates, side effects |
| 8 | [Auto-Assignment Algorithm](08-auto-assignment-algorithm.md) | Weighted scoring, candidate pool, fallback logic |
| 9 | [Security Architecture](09-security-architecture.md) | RBAC, tenant isolation, auth flow, audit interceptor |
| 10 | [Project Evolution Guide](10-project-evolution-guide.md) | How to avoid rewrites, extraction paths, migration strategy |

## Quick Reference

### Tech Stack
- **Frontend:** Next.js (App Router) + Tailwind + Zustand
- **Backend:** NestJS (modular monolith) + Prisma + PostgreSQL
- **Infra:** Redis + BullMQ + Socket.io + AWS S3 + Docker + Nginx
- **Phase 2:** FastAPI AI microservice

### Architecture Style
Modular monolith with event-driven internal communication. Designed for extraction into microservices when scale demands it.

### Multi-Tenancy
Shared database, shared schema, row-level isolation via Prisma middleware. Every tenant-scoped table has `firm_id`.

### Key Design Decisions
1. State machine for case lifecycle (no arbitrary status jumps)
2. Events for cross-module communication (zero direct coupling)
3. Vault with session-based unlock for sensitive documents
4. Weighted scoring for auto-assignment (not just round-robin)
5. Append-only partitioned audit logs
6. JWT + refresh token rotation with reuse detection
