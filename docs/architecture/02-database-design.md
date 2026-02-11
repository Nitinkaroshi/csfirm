# 02 — Multi-Tenant Database Design

## Tenancy Model: Shared Database, Row-Level Isolation

Every tenant-scoped table includes `firm_id UUID NOT NULL` with a composite index.

---

## Schema Organization

PostgreSQL schemas (not to be confused with Prisma schema) are used for logical separation:

```
public          → Core business tables (tenant-scoped)
audit           → Audit log tables (append-only, partitioned)
platform        → Platform-level tables (non-tenant: plans, feature flags)
```

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PLATFORM SCHEMA                              │
│                                                                       │
│  ┌──────────────┐                                                    │
│  │   Platform    │                                                    │
│  │   Settings    │                                                    │
│  └──────────────┘                                                    │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         PUBLIC SCHEMA                                 │
│                                                                       │
│  ┌──────────┐    ┌──────────┐    ┌──────────────┐                   │
│  │   Firm   │───▶│   User   │    │  Organization│                   │
│  │          │    │ (CS Staff)│    │  (Client Org)│                   │
│  └────┬─────┘    └────┬─────┘    └──────┬───────┘                   │
│       │               │                  │                            │
│       │          ┌────┴─────┐      ┌────┴────────┐                  │
│       │          │ Employee │      │  OrgUser    │                  │
│       │          │ Profile  │      │  (Client)   │                  │
│       │          └────┬─────┘      └──────┬──────┘                  │
│       │               │                    │                          │
│       ▼               ▼                    ▼                          │
│  ┌──────────┐    ┌─────────────────────────────┐                    │
│  │ Service  │───▶│           CASE              │                    │
│  │ Template │    │  (Central Entity)           │                    │
│  └──────────┘    └──────┬──────────────────────┘                    │
│                         │                                             │
│       ┌─────────┬───────┼────────┬──────────┬──────────┐            │
│       ▼         ▼       ▼        ▼          ▼          ▼            │
│  ┌────────┐┌────────┐┌───────┐┌────────┐┌────────┐┌────────┐      │
│  │ Case   ││ Case   ││ Case  ││ Case   ││ Case   ││Invoice │      │
│  │ Form   ││ Docs   ││ Chat  ││Transfer││ Flag   ││        │      │
│  │ Data   ││        ││       ││ Log    ││        ││        │      │
│  └────────┘└────────┘└───────┘└────────┘└────────┘└────────┘      │
│                         │                                             │
│                    ┌────┴─────┐                                      │
│                    │Chat Room │──▶ ChatMessage                       │
│                    └──────────┘                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         AUDIT SCHEMA                                  │
│                                                                       │
│  ┌───────────────┐    ┌──────────────────┐                          │
│  │  AuditLog     │    │  VaultAccessLog  │                          │
│  │  (Partitioned │    │  (Partitioned    │                          │
│  │   by month)   │    │   by month)      │                          │
│  └───────────────┘    └──────────────────┘                          │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Table Designs

### Firm (CS Company — the Tenant)

```sql
CREATE TABLE firm (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL UNIQUE,  -- subdomain: firm1.csfirm.com
    domain          VARCHAR(255),                   -- custom domain (optional)
    subscription_plan VARCHAR(50) NOT NULL DEFAULT 'trial',
    status          VARCHAR(20) NOT NULL DEFAULT 'active',  -- active, suspended, cancelled
    settings        JSONB NOT NULL DEFAULT '{}',    -- firm-level config
    max_users       INT NOT NULL DEFAULT 10,
    max_storage_gb  INT NOT NULL DEFAULT 5,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_firm_slug ON firm(slug);
```

### User (Authentication Entity — both CS staff and clients)

```sql
CREATE TABLE "user" (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    user_type       VARCHAR(20) NOT NULL,  -- 'staff' | 'client'
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    email_verified  BOOLEAN NOT NULL DEFAULT false,
    last_login_at   TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(firm_id, email)
);

CREATE INDEX idx_user_firm ON "user"(firm_id);
CREATE INDEX idx_user_email ON "user"(email);
```

### Employee Profile (CS Firm Staff)

```sql
CREATE TABLE employee_profile (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL UNIQUE REFERENCES "user"(id),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    role            VARCHAR(30) NOT NULL,  -- 'master_admin' | 'admin' | 'manager' | 'employee'
    department      VARCHAR(100),
    designation     VARCHAR(100),
    max_cases       INT NOT NULL DEFAULT 20,       -- workload cap
    active_cases    INT NOT NULL DEFAULT 0,        -- denormalized counter
    specializations VARCHAR(255)[],                 -- service categories this employee handles
    is_available    BOOLEAN NOT NULL DEFAULT true,  -- for assignment algorithm
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_emp_firm ON employee_profile(firm_id);
CREATE INDEX idx_emp_role ON employee_profile(firm_id, role);
CREATE INDEX idx_emp_available ON employee_profile(firm_id, is_available, active_cases);
```

### Organization (Client Company)

```sql
CREATE TABLE organization (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    name            VARCHAR(255) NOT NULL,
    type            VARCHAR(50),           -- pvt_ltd, llp, partnership, etc.
    cin             VARCHAR(50),           -- Company Identification Number
    pan             VARCHAR(20),
    gst             VARCHAR(20),
    registered_address JSONB,
    contact_info    JSONB,
    status          VARCHAR(20) NOT NULL DEFAULT 'active',
    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_org_firm ON organization(firm_id);
```

### OrgUser (Client User)

```sql
CREATE TABLE org_user (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    org_id          UUID NOT NULL REFERENCES organization(id),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    role            VARCHAR(30) NOT NULL DEFAULT 'owner',  -- 'owner' | 'member' (Phase 2)
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(user_id, org_id)
);

CREATE INDEX idx_orguser_firm ON org_user(firm_id);
CREATE INDEX idx_orguser_org ON org_user(org_id);
```

### Service Template

```sql
CREATE TABLE service_template (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    name            VARCHAR(255) NOT NULL,
    slug            VARCHAR(100) NOT NULL,
    category        VARCHAR(100) NOT NULL,          -- 'incorporation', 'compliance', 'annual_filing'
    description     TEXT,
    form_schema     JSONB NOT NULL DEFAULT '[]',    -- dynamic form definition
    document_requirements JSONB NOT NULL DEFAULT '[]', -- required doc types
    workflow_config JSONB NOT NULL DEFAULT '{}',    -- state machine overrides
    sla_config      JSONB NOT NULL DEFAULT '{}',    -- deadlines, escalation rules
    billing_template JSONB,                          -- default pricing
    validation_rules JSONB NOT NULL DEFAULT '[]',   -- cross-field validations
    is_active       BOOLEAN NOT NULL DEFAULT true,
    version         INT NOT NULL DEFAULT 1,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(firm_id, slug)
);

CREATE INDEX idx_svc_firm ON service_template(firm_id, is_active);
CREATE INDEX idx_svc_category ON service_template(firm_id, category);
```

### Case (Central Business Entity)

```sql
CREATE TABLE "case" (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id             UUID NOT NULL REFERENCES firm(id),
    case_number         VARCHAR(50) NOT NULL,         -- human-readable: CS-2026-00001
    org_id              UUID NOT NULL REFERENCES organization(id),
    service_id          UUID NOT NULL REFERENCES service_template(id),
    created_by_user_id  UUID NOT NULL REFERENCES "user"(id),
    assigned_to_id      UUID REFERENCES employee_profile(id),

    -- Status
    status              VARCHAR(30) NOT NULL DEFAULT 'draft',
    internal_flags      VARCHAR(50)[] NOT NULL DEFAULT '{}',
    priority            VARCHAR(10) NOT NULL DEFAULT 'normal', -- low, normal, high, urgent

    -- Form data
    form_data           JSONB NOT NULL DEFAULT '{}',

    -- SLA tracking
    sla_deadline        TIMESTAMPTZ,
    sla_breached        BOOLEAN NOT NULL DEFAULT false,

    -- Timestamps
    submitted_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(firm_id, case_number)
);

CREATE INDEX idx_case_firm ON "case"(firm_id);
CREATE INDEX idx_case_org ON "case"(firm_id, org_id);
CREATE INDEX idx_case_assigned ON "case"(firm_id, assigned_to_id, status);
CREATE INDEX idx_case_status ON "case"(firm_id, status);
CREATE INDEX idx_case_sla ON "case"(firm_id, sla_breached, sla_deadline) WHERE sla_breached = false;
```

### Case Document

```sql
CREATE TABLE case_document (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    case_id         UUID NOT NULL REFERENCES "case"(id),
    uploaded_by     UUID NOT NULL REFERENCES "user"(id),

    -- File info
    file_name       VARCHAR(255) NOT NULL,
    file_type       VARCHAR(50) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type       VARCHAR(100) NOT NULL,

    -- S3 reference
    s3_bucket       VARCHAR(100) NOT NULL,
    s3_key          VARCHAR(500) NOT NULL,

    -- Classification
    document_type   VARCHAR(50) NOT NULL,           -- 'application', 'id_proof', 'financial', etc.
    security_level  SMALLINT NOT NULL DEFAULT 1,    -- 1: normal, 2: sensitive (vault)

    -- Metadata
    description     TEXT,
    is_verified     BOOLEAN NOT NULL DEFAULT false,
    verified_by     UUID REFERENCES employee_profile(id),
    verified_at     TIMESTAMPTZ,

    status          VARCHAR(20) NOT NULL DEFAULT 'active', -- active, archived, deleted
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_doc_case ON case_document(firm_id, case_id);
CREATE INDEX idx_doc_security ON case_document(firm_id, security_level);
```

### Case Transfer Log

```sql
CREATE TABLE case_transfer_log (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    case_id         UUID NOT NULL REFERENCES "case"(id),
    from_employee_id UUID NOT NULL REFERENCES employee_profile(id),
    to_employee_id  UUID NOT NULL REFERENCES employee_profile(id),
    transferred_by  UUID NOT NULL REFERENCES "user"(id),
    reason          TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transfer_case ON case_transfer_log(case_id);
CREATE INDEX idx_transfer_firm ON case_transfer_log(firm_id);
```

### Chat Room + Messages

```sql
CREATE TABLE chat_room (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    case_id         UUID REFERENCES "case"(id),      -- NULL for general channels
    room_type       VARCHAR(20) NOT NULL,             -- 'client_case' | 'internal_case' | 'internal_general'
    name            VARCHAR(255),                      -- for general channels
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_chatroom_case ON chat_room(firm_id, case_id);
CREATE INDEX idx_chatroom_type ON chat_room(firm_id, room_type);

CREATE TABLE chat_room_member (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES chat_room(id),
    user_id         UUID NOT NULL REFERENCES "user"(id),
    role            VARCHAR(20) NOT NULL DEFAULT 'member', -- 'member' | 'admin'
    joined_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(room_id, user_id)
);

CREATE TABLE chat_message (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id         UUID NOT NULL REFERENCES chat_room(id),
    sender_id       UUID NOT NULL REFERENCES "user"(id),
    content         TEXT NOT NULL,
    message_type    VARCHAR(20) NOT NULL DEFAULT 'text', -- 'text' | 'file' | 'system'
    metadata        JSONB,                                -- file ref, mentions, etc.
    is_edited       BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Partitioned by month for performance at scale
CREATE INDEX idx_msg_room ON chat_message(room_id, created_at DESC);
```

### Invoice

```sql
CREATE TABLE invoice (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    org_id          UUID NOT NULL REFERENCES organization(id),
    case_id         UUID NOT NULL REFERENCES "case"(id),
    service_id      UUID NOT NULL REFERENCES service_template(id),

    invoice_number  VARCHAR(50) NOT NULL,
    amount          DECIMAL(12,2) NOT NULL,
    tax_breakup     JSONB NOT NULL DEFAULT '{}',      -- { cgst: 9, sgst: 9, igst: 0, cess: 0 }
    total_amount    DECIMAL(12,2) NOT NULL,
    currency        VARCHAR(3) NOT NULL DEFAULT 'INR',

    status          VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, issued, paid, overdue, cancelled
    issued_at       TIMESTAMPTZ,
    due_date        TIMESTAMPTZ,
    paid_at         TIMESTAMPTZ,

    notes           TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}',

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(firm_id, invoice_number)
);

CREATE INDEX idx_invoice_case ON invoice(firm_id, case_id);
CREATE INDEX idx_invoice_org ON invoice(firm_id, org_id);
CREATE INDEX idx_invoice_status ON invoice(firm_id, status);
```

### Notification

```sql
CREATE TABLE notification (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL REFERENCES firm(id),
    user_id         UUID NOT NULL REFERENCES "user"(id),

    event_type      VARCHAR(50) NOT NULL,       -- CASE_SUBMITTED, INVOICE_ISSUED, etc.
    title           VARCHAR(255) NOT NULL,
    body            TEXT NOT NULL,

    entity_type     VARCHAR(50),                -- 'case', 'invoice', etc.
    entity_id       UUID,                       -- reference to the entity

    channel         VARCHAR(20) NOT NULL,       -- 'in_app' | 'email' | 'push'
    is_read         BOOLEAN NOT NULL DEFAULT false,
    read_at         TIMESTAMPTZ,

    metadata        JSONB NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user ON notification(firm_id, user_id, is_read, created_at DESC);
```

### Audit Log (Append-Only, Partitioned)

```sql
CREATE TABLE audit_log (
    id              UUID DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL,
    actor_id        UUID NOT NULL,
    actor_role      VARCHAR(30) NOT NULL,

    entity_type     VARCHAR(50) NOT NULL,       -- 'case', 'invoice', 'service_template', etc.
    entity_id       UUID NOT NULL,
    action          VARCHAR(30) NOT NULL,       -- 'create', 'update', 'delete', 'status_change'

    before_state    JSONB,
    after_state     JSONB,
    change_summary  TEXT,                        -- human-readable diff

    ip_address      INET,
    user_agent      TEXT,
    request_id      UUID,                        -- correlation ID

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create monthly partitions (automated via pg_cron or migration)
-- CREATE TABLE audit_log_2026_01 PARTITION OF audit_log
--   FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE INDEX idx_audit_entity ON audit_log(firm_id, entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_log(firm_id, actor_id, created_at DESC);
```

### Vault Access Log (Separate, Append-Only)

```sql
CREATE TABLE vault_access_log (
    id              UUID DEFAULT gen_random_uuid(),
    firm_id         UUID NOT NULL,
    user_id         UUID NOT NULL,
    document_id     UUID NOT NULL,
    case_id         UUID NOT NULL,

    action          VARCHAR(20) NOT NULL,       -- VIEW, DOWNLOAD, UPLOAD, DELETE
    ip_address      INET,
    user_agent      TEXT,
    session_id      VARCHAR(100),               -- vault session reference

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

CREATE INDEX idx_vault_doc ON vault_access_log(firm_id, document_id, created_at DESC);
CREATE INDEX idx_vault_user ON vault_access_log(firm_id, user_id, created_at DESC);
```

---

## Indexing Strategy

### Composite Index Pattern
Every tenant-scoped query uses `firm_id` as the leading column:
```sql
-- GOOD: firm_id leads, enables partition pruning at tenant level
CREATE INDEX idx_case_org ON "case"(firm_id, org_id);

-- BAD: Missing firm_id, will scan across tenants
CREATE INDEX idx_case_org ON "case"(org_id);
```

### Partial Indexes for Hot Queries
```sql
-- Only index active cases for assignment queries
CREATE INDEX idx_active_cases
  ON "case"(firm_id, assigned_to_id, priority)
  WHERE status NOT IN ('completed', 'rejected');

-- Only index unread notifications
CREATE INDEX idx_unread_notif
  ON notification(firm_id, user_id, created_at DESC)
  WHERE is_read = false;

-- Only index non-breached SLAs for the SLA checker job
CREATE INDEX idx_sla_check
  ON "case"(sla_deadline)
  WHERE sla_breached = false AND status NOT IN ('completed', 'rejected', 'draft');
```

---

## Data Isolation Verification

### Prisma Middleware (Enforced on Every Query)
```typescript
// This runs on EVERY Prisma operation — no opt-out
prisma.$use(async (params, next) => {
  const firmId = getTenantId(); // from AsyncLocalStorage

  if (TENANT_SCOPED_MODELS.includes(params.model)) {
    // Inject firm_id into WHERE for reads
    if (['findMany', 'findFirst', 'findUnique', 'count', 'aggregate'].includes(params.action)) {
      params.args.where = { ...params.args.where, firm_id: firmId };
    }
    // Inject firm_id into data for writes
    if (['create', 'createMany'].includes(params.action)) {
      params.args.data = { ...params.args.data, firm_id: firmId };
    }
    // Inject firm_id into WHERE for mutations
    if (['update', 'updateMany', 'delete', 'deleteMany'].includes(params.action)) {
      params.args.where = { ...params.args.where, firm_id: firmId };
    }
  }

  return next(params);
});
```

---

## Migration Strategy

- All migrations via `prisma migrate`
- Partition creation automated via a seed/migration script
- Monthly partition creation scheduled via BullMQ recurring job
- Zero-downtime migrations: additive only in Phase 1 (add columns, add tables, add indexes)
- Destructive migrations (drop column) require explicit two-phase approach:
  1. Deploy code that stops reading the column
  2. Next deploy: drop the column
