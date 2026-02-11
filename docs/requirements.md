# CSFIRM Platform - Requirements Specification

## Overview

Production-grade multi-tenant SaaS platform for Company Secretary (CS) firms.
Compliance-heavy, workflow-driven enterprise SaaS designed to handle thousands of firms.

## Tech Stack

### Frontend
- Next.js (App Router, TypeScript)
- Tailwind CSS
- Zustand (primary) / Redux Toolkit (complex modules)

### Backend
- NestJS (modular monolith, extractable microservices)
- PostgreSQL (primary database)
- Prisma ORM
- Redis (caching, sessions, pub/sub)
- BullMQ (async job processing)
- Socket.io (real-time communication)

### Infrastructure
- AWS S3 (vault storage, private bucket + signed URLs)
- Dockerized services
- Nginx reverse proxy

### Phase 2
- Python FastAPI AI microservice

---

## Functional Requirements

### 1. Role-Based Access Control

#### CS Firm Internal Roles
| Role | Permissions |
|------|------------|
| Master Admin | Full control, service builder, override, analytics |
| Admin/Manager | Case management, assignment, escalation |
| Employee | Assigned case execution only |

#### Client Side Roles
| Role | Permissions |
|------|------------|
| Organization Owner | Full org access, case creation, billing |
| Org User (future) | Scoped access per org policies |

---

### 2. Service Architecture

Services behave as **configurable templates** — not hardcoded workflows.

Each Service includes:
- Metadata (name, description, category, SLA defaults)
- Dynamic Form Schema (JSON-driven)
- Document Requirements (per service type)
- Workflow States (configurable per service)
- SLA Rules (deadlines, escalation triggers)
- Optional Billing Template
- Validation Rules

#### Dynamic Form Field Types
| Type | Validation |
|------|-----------|
| Text | Required/Optional, Regex, Min/Max Length |
| Dropdown | Enum values, Required/Optional |
| Date | Required/Optional, Min/Max Date |
| Number | Required/Optional, Min/Max, Integer/Decimal |
| Boolean | Required/Optional |
| File Upload | Required/Optional, Allowed MIME types, Max size |

---

### 3. Case Lifecycle

#### Client Actions
1. Create case from service template
2. Fill dynamic form
3. Upload required documents
4. Submit case

#### CS Firm Actions
- Auto-assign (rule-based)
- Update status
- Request additional documents
- Escalate case
- Transfer case (with mandatory logging)
- Add internal flags
- Approve / Reject case

#### Client-Visible Statuses
```
Draft → Submitted → Under Review → Docs Required → Processing → Completed → Rejected
```

#### Internal Flags (not visible to client)
- Compliance Risk
- Client Delay
- Waiting Govt Portal
- Dead End
- Priority Client

---

### 4. Case Transfer Logging

Every transfer MUST log:
- `from_employee_id`
- `to_employee_id`
- `reason` (mandatory text)
- `transferred_at` (timestamp)
- `transferred_by` (actor — may differ from from_employee)

---

### 5. Chat System

**Case-centric only. No global client chat.**

#### Chat Types
| Type | Participants | Visibility |
|------|-------------|-----------|
| Client Case Chat | Client ↔ CS firm (assigned employee) | Client + assigned CS staff |
| Internal Case Chat | CS firm employees on case | CS firm only — NEVER visible to client |
| General Internal Channels | CS firm team | CS firm only |

**Critical Rule:** Internal messages must NEVER be visible to client under any circumstance.

---

### 6. Document Vault

#### Two Security Levels
| Level | Description | Examples |
|-------|------------|---------|
| Level 1 | Normal case files | Applications, forms, correspondence |
| Level 2 | Sensitive documents | ID proofs, financial docs, PAN, Aadhaar |

#### Level 2 Requirements
- Session-based vault unlock (separate auth challenge)
- Auto-lock after configurable inactivity period
- Access audit logging (every view, download, share)

#### Vault Access Audit Log
| Field | Type |
|-------|------|
| user_id | UUID |
| doc_id | UUID |
| case_id | UUID |
| action | ENUM (VIEW, DOWNLOAD, UPLOAD, DELETE, SHARE) |
| ip_address | String |
| user_agent | String |
| timestamp | DateTime |

#### Storage
- AWS S3 private bucket (no public access)
- Signed URL access only (time-limited)
- Lifecycle rules: Active → Infrequent Access → Glacier

---

### 7. Billing (Phase 1 — Design Only)

#### Invoice Model
| Field | Type | Constraint |
|-------|------|-----------|
| invoice_id | UUID | PK |
| org_id | UUID | FK → Organization |
| case_id | UUID | FK → Case |
| service_id | UUID | FK → Service |
| amount | Decimal | Required |
| tax_breakup | JSONB | GST components |
| currency | String | Default: INR |
| status | Enum | DRAFT, ISSUED, PAID, OVERDUE, CANCELLED |
| issued_at | DateTime | Nullable |
| due_date | DateTime | Nullable |

#### Business Rules
- Case CAN exist without invoice
- Invoice CANNOT exist without case
- One case → one invoice (1:1 in Phase 1)

---

### 8. Notification System

#### Architecture
```
Event → Notification Rule Engine → Channel Router → Delivery
```

#### Channels
- In-app (real-time via Socket.io)
- Email (templated, async via BullMQ)
- WhatsApp (Phase 2)
- Push Notifications (Phase 2)

#### Event Types
| Event | Recipients |
|-------|-----------|
| CASE_SUBMITTED | Assigned employee, Admin |
| CASE_DOCS_REQUESTED | Client (org owner) |
| CASE_TRANSFERRED | New assignee, Admin |
| CASE_STATUS_CHANGED | Client, Assigned employee |
| CASE_COMPLETED | Client, Admin |
| CASE_ESCALATED | Admin, Manager |
| INVOICE_ISSUED | Client |
| INVOICE_OVERDUE | Client, Admin |
| CHAT_MESSAGE_RECEIVED | Relevant participants |

Processing: BullMQ for all async delivery.

---

### 9. Audit Logging

Every mutation logs:
| Field | Type |
|-------|------|
| actor_id | UUID |
| actor_role | String |
| entity_type | String |
| entity_id | UUID |
| action | String |
| before_state | JSONB |
| after_state | JSONB |
| ip_address | String |
| user_agent | String |
| timestamp | DateTime |

#### Critical Audit Points
- Case status change
- Case transfer
- Vault document access
- Service template modification
- Invoice creation/modification
- Role/permission changes
- User authentication events

---

## Non-Functional Requirements

### Performance
- Page load < 2s (P95)
- API response < 500ms (P95)
- Real-time chat latency < 200ms
- Support 1000+ concurrent users per firm

### Security
- Row-Level Security (tenant isolation)
- JWT + refresh token rotation
- Rate limiting per tenant
- Input sanitization at API boundary
- Encrypted at rest (S3 SSE-S3)
- TLS in transit

### Scalability
- Horizontal scaling via Docker
- Connection pooling (PgBouncer)
- Redis cluster for sessions/cache
- BullMQ workers scale independently

### Compliance
- Full audit trail
- Data residency awareness
- GDPR-ready data deletion workflows
- Document retention policies
