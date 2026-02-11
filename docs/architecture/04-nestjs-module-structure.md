# 04 — NestJS Module Structure

## Monorepo Layout

```
csfirm/
├── apps/
│   ├── api/                          # NestJS API application
│   │   ├── src/
│   │   │   ├── main.ts               # Bootstrap (Fastify adapter)
│   │   │   ├── app.module.ts          # Root module
│   │   │   │
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   ├── tenant/
│   │   │   │   ├── user/
│   │   │   │   ├── organization/
│   │   │   │   ├── service-template/
│   │   │   │   ├── case/
│   │   │   │   ├── document/
│   │   │   │   ├── chat/
│   │   │   │   ├── invoice/
│   │   │   │   ├── notification/
│   │   │   │   ├── audit/
│   │   │   │   └── admin/
│   │   │   │
│   │   │   ├── common/                # Shared infrastructure
│   │   │   │   ├── guards/
│   │   │   │   ├── interceptors/
│   │   │   │   ├── pipes/
│   │   │   │   ├── filters/
│   │   │   │   ├── decorators/
│   │   │   │   ├── middleware/
│   │   │   │   ├── interfaces/
│   │   │   │   └── constants/
│   │   │   │
│   │   │   ├── config/                # Configuration
│   │   │   │   ├── app.config.ts
│   │   │   │   ├── database.config.ts
│   │   │   │   ├── redis.config.ts
│   │   │   │   ├── s3.config.ts
│   │   │   │   ├── jwt.config.ts
│   │   │   │   └── index.ts
│   │   │   │
│   │   │   ├── database/              # Prisma + seeding
│   │   │   │   ├── prisma.module.ts
│   │   │   │   ├── prisma.service.ts
│   │   │   │   ├── tenant.middleware.ts
│   │   │   │   └── seed/
│   │   │   │
│   │   │   └── jobs/                  # BullMQ job definitions
│   │   │       ├── jobs.module.ts
│   │   │       └── processors/
│   │   │
│   │   ├── test/
│   │   │   ├── e2e/
│   │   │   └── fixtures/
│   │   │
│   │   └── tsconfig.json
│   │
│   ├── worker/                        # BullMQ worker (separate process)
│   │   ├── src/
│   │   │   ├── main.ts
│   │   │   ├── worker.module.ts
│   │   │   └── processors/
│   │   │       ├── notification.processor.ts
│   │   │       ├── email.processor.ts
│   │   │       ├── sla-checker.processor.ts
│   │   │       └── cleanup.processor.ts
│   │   └── tsconfig.json
│   │
│   └── web/                           # Next.js frontend
│       ├── src/
│       │   ├── app/                   # App Router
│       │   ├── components/
│       │   ├── lib/
│       │   ├── stores/
│       │   └── types/
│       └── next.config.ts
│
├── packages/                          # Shared packages
│   ├── shared-types/                  # DTOs, interfaces, enums shared between api + web
│   │   ├── src/
│   │   │   ├── dto/
│   │   │   ├── enums/
│   │   │   ├── interfaces/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   └── eslint-config/                 # Shared ESLint config
│       └── index.js
│
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
│
├── docker/
│   ├── Dockerfile.api
│   ├── Dockerfile.worker
│   ├── Dockerfile.web
│   └── nginx/
│       └── nginx.conf
│
├── docker-compose.yml
├── docker-compose.dev.yml
├── turbo.json                         # Turborepo config
├── package.json
└── .env.example
```

---

## Module Deep Dive

### Auth Module

```
modules/auth/
├── auth.module.ts
├── auth.controller.ts
├── auth.service.ts
├── strategies/
│   ├── jwt.strategy.ts                # JWT validation
│   └── local.strategy.ts             # Email/password login
├── dto/
│   ├── login.dto.ts
│   ├── register.dto.ts
│   ├── refresh-token.dto.ts
│   └── change-password.dto.ts
├── interfaces/
│   ├── jwt-payload.interface.ts
│   └── auth-response.interface.ts
└── guards/
    └── jwt-auth.guard.ts
```

**Responsibilities:**
- Login (email/password → JWT + refresh token)
- Register (firm staff or client)
- Refresh token rotation with family tracking
- Password reset flow
- Email verification
- Session management (revoke tokens)

---

### Tenant Module

```
modules/tenant/
├── tenant.module.ts
├── tenant.service.ts
├── tenant.controller.ts              # Platform admin only
├── dto/
│   ├── create-firm.dto.ts
│   └── update-firm.dto.ts
└── tenant-context/
    ├── tenant-context.service.ts     # AsyncLocalStorage wrapper
    └── tenant.middleware.ts          # Extract firm_id from JWT → ALS
```

**Responsibilities:**
- Firm CRUD (platform admin)
- Tenant context injection (every request)
- Tenant settings management
- Subscription plan enforcement

---

### User Module

```
modules/user/
├── user.module.ts
├── user.controller.ts
├── user.service.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   └── user-response.dto.ts
└── user.repository.ts               # Prisma queries, tenant-scoped
```

---

### Organization Module

```
modules/organization/
├── organization.module.ts
├── organization.controller.ts
├── organization.service.ts
├── dto/
│   ├── create-organization.dto.ts
│   ├── update-organization.dto.ts
│   └── org-response.dto.ts
└── organization.repository.ts
```

---

### Service Template Module

```
modules/service-template/
├── service-template.module.ts
├── service-template.controller.ts
├── service-template.service.ts
├── dto/
│   ├── create-service.dto.ts
│   ├── update-service.dto.ts
│   └── service-response.dto.ts
├── validators/
│   ├── form-schema.validator.ts      # Validates form_schema JSON structure
│   └── workflow-config.validator.ts  # Validates workflow_config
└── service-template.repository.ts
```

**Responsibilities:**
- CRUD for service templates
- Form schema validation (ensure JSON structure is valid)
- Version management (when template is modified, bump version)
- Template duplication

---

### Case Module (Largest Module)

```
modules/case/
├── case.module.ts
├── case.controller.ts
├── case.service.ts
├── case.repository.ts
│
├── dto/
│   ├── create-case.dto.ts
│   ├── update-case.dto.ts
│   ├── submit-case.dto.ts
│   ├── update-status.dto.ts
│   ├── transfer-case.dto.ts
│   ├── add-flag.dto.ts
│   └── case-response.dto.ts
│
├── state-machine/
│   ├── case-state-machine.ts         # XState or custom FSM
│   ├── case-transitions.ts           # Allowed transitions per role
│   └── case-state.guard.ts          # Validates transition is legal
│
├── assignment/
│   ├── assignment.service.ts         # Auto-assignment logic
│   └── assignment.strategy.ts        # Strategy pattern for rules
│
├── transfer/
│   ├── transfer.service.ts
│   └── transfer.repository.ts
│
├── listeners/
│   ├── case-created.listener.ts
│   ├── case-submitted.listener.ts
│   └── case-status-changed.listener.ts
│
└── validators/
    └── form-data.validator.ts        # Validates form_data against form_schema
```

**Responsibilities:**
- Case CRUD
- Status transitions (state machine enforced)
- Auto-assignment on submission
- Manual transfer with logging
- Flag management
- SLA deadline calculation
- Form data validation against service template schema

---

### Document Module

```
modules/document/
├── document.module.ts
├── document.controller.ts
├── document.service.ts
├── document.repository.ts
│
├── dto/
│   ├── upload-document.dto.ts
│   ├── document-response.dto.ts
│   └── request-documents.dto.ts
│
├── vault/
│   ├── vault.service.ts              # Vault session management
│   ├── vault.guard.ts                # Checks vault session before sensitive doc access
│   └── vault-session.store.ts        # Redis-backed session store
│
├── s3/
│   ├── s3.service.ts                 # Upload, signed URL generation
│   └── s3.config.ts
│
└── listeners/
    └── document-accessed.listener.ts  # Vault access logging
```

**Responsibilities:**
- File upload to S3 (multipart)
- Signed URL generation (time-limited)
- Document verification workflow
- Vault session management (unlock, auto-lock)
- Vault access audit logging
- Document requirement checking per case/service

---

### Chat Module

```
modules/chat/
├── chat.module.ts
├── chat.controller.ts                # REST endpoints for history, rooms
├── chat.service.ts
├── chat.repository.ts
│
├── gateway/
│   ├── chat.gateway.ts               # Socket.io gateway
│   └── chat-auth.middleware.ts       # JWT auth on WebSocket handshake
│
├── dto/
│   ├── create-room.dto.ts
│   ├── send-message.dto.ts
│   └── message-response.dto.ts
│
└── guards/
    └── room-access.guard.ts          # Ensures client NEVER sees internal rooms
```

**Responsibilities:**
- Room management (auto-create on case creation: 1 client + 1 internal)
- Real-time messaging via Socket.io
- Message persistence
- Room-level access control (CLIENT_CASE vs INTERNAL_CASE isolation)
- Message history (paginated)
- Typing indicators

**Critical Guard:** `room-access.guard.ts` ensures:
- Client users can ONLY access `CLIENT_CASE` rooms for their org's cases
- `INTERNAL_CASE` and `INTERNAL_GENERAL` rooms are INVISIBLE to client users
- This is enforced at both REST and WebSocket levels

---

### Invoice Module

```
modules/invoice/
├── invoice.module.ts
├── invoice.controller.ts
├── invoice.service.ts
├── invoice.repository.ts
├── dto/
│   ├── create-invoice.dto.ts
│   ├── update-invoice.dto.ts
│   └── invoice-response.dto.ts
└── listeners/
    └── invoice-status-changed.listener.ts
```

---

### Notification Module

```
modules/notification/
├── notification.module.ts
├── notification.controller.ts         # Mark read, list notifications
├── notification.service.ts
├── notification.repository.ts
│
├── dto/
│   └── notification-response.dto.ts
│
├── listeners/                         # Event → Notification creation
│   ├── case-event.listener.ts
│   ├── chat-event.listener.ts
│   └── invoice-event.listener.ts
│
├── channels/                          # Delivery adapters
│   ├── in-app.channel.ts
│   ├── email.channel.ts
│   └── channel.interface.ts
│
├── templates/                         # Email templates
│   ├── case-submitted.hbs
│   ├── docs-requested.hbs
│   └── invoice-issued.hbs
│
└── rules/
    └── notification-rule.engine.ts    # Determines who gets notified via what channel
```

---

### Audit Module

```
modules/audit/
├── audit.module.ts
├── audit.service.ts
├── audit.repository.ts
├── audit.controller.ts               # Admin: query audit trail
├── interceptors/
│   └── audit.interceptor.ts          # Auto-capture mutations
└── dto/
    └── audit-query.dto.ts
```

**The AuditInterceptor is registered GLOBALLY.** It:
1. Captures the `before` state (pre-handler)
2. Lets the handler execute
3. Captures the `after` state (post-handler)
4. Writes the audit log entry asynchronously (fire-and-forget to BullMQ)

---

### Admin Module

```
modules/admin/
├── admin.module.ts
├── admin.controller.ts
├── admin.service.ts
└── dto/
    ├── dashboard-stats.dto.ts
    └── firm-analytics.dto.ts
```

**Responsibilities:**
- Platform-level admin dashboard (cross-tenant, for platform owner)
- Firm-level admin dashboard (within tenant, for Master Admin)
- Usage analytics
- Firm onboarding

---

## Common (Shared Infrastructure)

```
common/
├── guards/
│   ├── auth.guard.ts                  # JWT validation
│   ├── tenant.guard.ts               # Tenant exists and is active
│   ├── rbac.guard.ts                 # Role + permission check
│   ├── vault.guard.ts               # Vault session validation
│   └── guards.module.ts
│
├── interceptors/
│   ├── audit.interceptor.ts           # Auto mutation logging
│   ├── response-transform.interceptor.ts  # { success, data, meta }
│   ├── performance.interceptor.ts     # Log slow requests
│   └── tenant-inject.interceptor.ts   # Ensure firm_id on create ops
│
├── pipes/
│   └── validation.pipe.ts            # class-validator global pipe
│
├── filters/
│   ├── http-exception.filter.ts      # Structured error responses
│   └── prisma-exception.filter.ts    # P2002, P2025 → user-friendly errors
│
├── decorators/
│   ├── current-user.decorator.ts     # @CurrentUser() parameter decorator
│   ├── current-firm.decorator.ts     # @CurrentFirm() parameter decorator
│   ├── roles.decorator.ts           # @Roles('ADMIN', 'MANAGER')
│   ├── audit-action.decorator.ts    # @AuditAction('STATUS_CHANGE')
│   └── public.decorator.ts          # @Public() — skip auth
│
├── middleware/
│   ├── request-id.middleware.ts      # Inject X-Request-ID
│   ├── tenant-context.middleware.ts  # JWT → firm_id → AsyncLocalStorage
│   └── request-logger.middleware.ts  # Structured request logging
│
├── interfaces/
│   ├── paginated-response.interface.ts
│   ├── api-response.interface.ts
│   └── tenant-context.interface.ts
│
└── constants/
    ├── events.constants.ts           # All event names as constants
    ├── queues.constants.ts           # BullMQ queue names
    └── permissions.constants.ts      # Permission matrix
```

---

## Next.js Frontend Structure

```
apps/web/src/
├── app/                               # App Router
│   ├── (auth)/                       # Auth layout group
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── forgot-password/page.tsx
│   │
│   ├── (dashboard)/                  # Authenticated layout group
│   │   ├── layout.tsx                # Sidebar + header
│   │   │
│   │   ├── (firm)/                   # CS Firm routes
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── cases/
│   │   │   │   ├── page.tsx          # Case list
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx      # Case detail
│   │   │   │       ├── chat/page.tsx
│   │   │   │       └── documents/page.tsx
│   │   │   ├── services/
│   │   │   │   ├── page.tsx
│   │   │   │   └── builder/page.tsx  # Service template builder
│   │   │   ├── clients/
│   │   │   │   ├── page.tsx
│   │   │   │   └── [orgId]/page.tsx
│   │   │   ├── team/page.tsx
│   │   │   ├── invoices/page.tsx
│   │   │   └── settings/page.tsx
│   │   │
│   │   └── (client)/                 # Client routes
│   │       ├── dashboard/page.tsx
│   │       ├── cases/
│   │       │   ├── page.tsx
│   │       │   ├── new/page.tsx
│   │       │   └── [id]/page.tsx
│   │       └── documents/page.tsx
│   │
│   ├── layout.tsx                    # Root layout
│   └── page.tsx                      # Landing / redirect
│
├── components/
│   ├── ui/                           # Design system atoms
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── table.tsx
│   │   ├── badge.tsx
│   │   └── ...
│   ├── forms/
│   │   ├── dynamic-form-renderer.tsx # Renders forms from JSON schema
│   │   └── field-components/
│   │       ├── text-field.tsx
│   │       ├── dropdown-field.tsx
│   │       ├── date-field.tsx
│   │       ├── number-field.tsx
│   │       └── boolean-field.tsx
│   ├── case/
│   │   ├── case-card.tsx
│   │   ├── case-status-badge.tsx
│   │   ├── case-timeline.tsx
│   │   └── case-transfer-modal.tsx
│   ├── chat/
│   │   ├── chat-window.tsx
│   │   ├── message-bubble.tsx
│   │   └── chat-input.tsx
│   ├── layout/
│   │   ├── sidebar.tsx
│   │   ├── header.tsx
│   │   └── breadcrumb.tsx
│   └── vault/
│       ├── vault-unlock-modal.tsx
│       └── document-viewer.tsx
│
├── lib/
│   ├── api/                          # API client
│   │   ├── client.ts                 # Axios/fetch wrapper with auth
│   │   ├── cases.api.ts
│   │   ├── documents.api.ts
│   │   ├── chat.api.ts
│   │   └── ...
│   ├── socket/
│   │   └── socket-client.ts         # Socket.io client singleton
│   ├── hooks/
│   │   ├── use-auth.ts
│   │   ├── use-cases.ts
│   │   ├── use-chat.ts
│   │   ├── use-notifications.ts
│   │   └── use-vault.ts
│   └── utils/
│       ├── form-validator.ts         # Client-side form schema validation
│       └── date.ts
│
├── stores/                           # Zustand stores
│   ├── auth.store.ts
│   ├── case.store.ts
│   ├── chat.store.ts
│   ├── notification.store.ts
│   └── vault.store.ts
│
└── types/
    └── index.ts                      # Re-export from @csfirm/shared-types
```

---

## API Response Envelope

Every API response follows this structure:

```typescript
// Success
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "requestId": "uuid"
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "CASE_INVALID_TRANSITION",
    "message": "Cannot transition from DRAFT to COMPLETED",
    "details": { ... }
  },
  "meta": {
    "requestId": "uuid"
  }
}
```

This is enforced by `ResponseTransformInterceptor` globally — no controller ever constructs this manually.
