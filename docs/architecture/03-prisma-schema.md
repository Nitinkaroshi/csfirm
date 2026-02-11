# 03 — Prisma Schema Design (Core Models)

## File: `prisma/schema.prisma`

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["fullTextSearch", "multiSchema"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  schemas  = ["public", "audit"]
}

// ============================================================================
// ENUMS
// ============================================================================

enum UserType {
  STAFF
  CLIENT

  @@schema("public")
}

enum FirmStatus {
  ACTIVE
  SUSPENDED
  CANCELLED

  @@schema("public")
}

enum StaffRole {
  MASTER_ADMIN
  ADMIN
  MANAGER
  EMPLOYEE

  @@schema("public")
}

enum OrgUserRole {
  OWNER
  MEMBER

  @@schema("public")
}

enum CaseStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  DOCS_REQUIRED
  PROCESSING
  COMPLETED
  REJECTED

  @@schema("public")
}

enum CasePriority {
  LOW
  NORMAL
  HIGH
  URGENT

  @@schema("public")
}

enum InternalFlag {
  COMPLIANCE_RISK
  CLIENT_DELAY
  WAITING_GOVT_PORTAL
  DEAD_END
  PRIORITY_CLIENT

  @@schema("public")
}

enum DocumentSecurityLevel {
  NORMAL    // Level 1
  SENSITIVE // Level 2 — vault

  @@schema("public")
}

enum DocumentStatus {
  ACTIVE
  ARCHIVED
  DELETED

  @@schema("public")
}

enum InvoiceStatus {
  DRAFT
  ISSUED
  PAID
  OVERDUE
  CANCELLED

  @@schema("public")
}

enum ChatRoomType {
  CLIENT_CASE
  INTERNAL_CASE
  INTERNAL_GENERAL

  @@schema("public")
}

enum MessageType {
  TEXT
  FILE
  SYSTEM

  @@schema("public")
}

enum NotificationChannel {
  IN_APP
  EMAIL
  PUSH
  WHATSAPP

  @@schema("public")
}

enum VaultAction {
  VIEW
  DOWNLOAD
  UPLOAD
  DELETE
  SHARE

  @@schema("audit")
}

enum AuditAction {
  CREATE
  UPDATE
  DELETE
  STATUS_CHANGE
  TRANSFER
  LOGIN
  LOGOUT
  VAULT_ACCESS

  @@schema("audit")
}

// ============================================================================
// FIRM (TENANT)
// ============================================================================

model Firm {
  id               String   @id @default(uuid()) @db.Uuid
  name             String   @db.VarChar(255)
  slug             String   @unique @db.VarChar(100)
  domain           String?  @db.VarChar(255)
  subscriptionPlan String   @default("trial") @map("subscription_plan") @db.VarChar(50)
  status           FirmStatus @default(ACTIVE)
  settings         Json     @default("{}")
  maxUsers         Int      @default(10) @map("max_users")
  maxStorageGb     Int      @default(5) @map("max_storage_gb")
  createdAt        DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  users            User[]
  employees        EmployeeProfile[]
  organizations    Organization[]
  orgUsers         OrgUser[]
  serviceTemplates ServiceTemplate[]
  cases            Case[]
  caseDocuments    CaseDocument[]
  caseTransfers    CaseTransferLog[]
  chatRooms        ChatRoom[]
  invoices         Invoice[]
  notifications    Notification[]

  @@map("firm")
  @@schema("public")
}

// ============================================================================
// USER (Authentication Entity)
// ============================================================================

model User {
  id             String    @id @default(uuid()) @db.Uuid
  firmId         String    @map("firm_id") @db.Uuid
  email          String    @db.VarChar(255)
  passwordHash   String    @map("password_hash") @db.VarChar(255)
  firstName      String    @map("first_name") @db.VarChar(100)
  lastName       String    @map("last_name") @db.VarChar(100)
  phone          String?   @db.VarChar(20)
  userType       UserType  @map("user_type")
  status         String    @default("active") @db.VarChar(20)
  emailVerified  Boolean   @default(false) @map("email_verified")
  lastLoginAt    DateTime? @map("last_login_at") @db.Timestamptz
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt      DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  firm              Firm              @relation(fields: [firmId], references: [id])
  employeeProfile   EmployeeProfile?
  orgUsers          OrgUser[]
  createdCases      Case[]            @relation("CaseCreator")
  uploadedDocuments CaseDocument[]    @relation("DocUploader")
  chatMemberships   ChatRoomMember[]
  chatMessages      ChatMessage[]
  notifications     Notification[]
  refreshTokens     RefreshToken[]

  @@unique([firmId, email])
  @@index([firmId])
  @@index([email])
  @@map("user")
  @@schema("public")
}

// ============================================================================
// REFRESH TOKEN
// ============================================================================

model RefreshToken {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @map("user_id") @db.Uuid
  tokenHash   String   @map("token_hash") @db.VarChar(255)
  family      String   @db.VarChar(100) // Token family for rotation detection
  isRevoked   Boolean  @default(false) @map("is_revoked")
  expiresAt   DateTime @map("expires_at") @db.Timestamptz
  createdAt   DateTime @default(now()) @map("created_at") @db.Timestamptz
  userAgent   String?  @map("user_agent")
  ipAddress   String?  @map("ip_address") @db.VarChar(45)

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([tokenHash])
  @@map("refresh_token")
  @@schema("public")
}

// ============================================================================
// EMPLOYEE PROFILE (CS Firm Staff)
// ============================================================================

model EmployeeProfile {
  id              String    @id @default(uuid()) @db.Uuid
  userId          String    @unique @map("user_id") @db.Uuid
  firmId          String    @map("firm_id") @db.Uuid
  role            StaffRole
  department      String?   @db.VarChar(100)
  designation     String?   @db.VarChar(100)
  maxCases        Int       @default(20) @map("max_cases")
  activeCases     Int       @default(0) @map("active_cases")
  specializations String[]  @default([])
  isAvailable     Boolean   @default(true) @map("is_available")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  user            User              @relation(fields: [userId], references: [id])
  firm            Firm              @relation(fields: [firmId], references: [id])
  assignedCases   Case[]            @relation("CaseAssignee")
  verifiedDocs    CaseDocument[]    @relation("DocVerifier")
  transfersFrom   CaseTransferLog[] @relation("TransferFrom")
  transfersTo     CaseTransferLog[] @relation("TransferTo")

  @@index([firmId])
  @@index([firmId, role])
  @@index([firmId, isAvailable, activeCases])
  @@map("employee_profile")
  @@schema("public")
}

// ============================================================================
// ORGANIZATION (Client Company)
// ============================================================================

model Organization {
  id                String   @id @default(uuid()) @db.Uuid
  firmId            String   @map("firm_id") @db.Uuid
  name              String   @db.VarChar(255)
  type              String?  @db.VarChar(50)  // pvt_ltd, llp, partnership
  cin               String?  @db.VarChar(50)
  pan               String?  @db.VarChar(20)
  gst               String?  @db.VarChar(20)
  registeredAddress Json?    @map("registered_address")
  contactInfo       Json?    @map("contact_info")
  status            String   @default("active") @db.VarChar(20)
  metadata          Json     @default("{}")
  createdAt         DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt         DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  firm              Firm      @relation(fields: [firmId], references: [id])
  orgUsers          OrgUser[]
  cases             Case[]
  invoices          Invoice[]

  @@index([firmId])
  @@map("organization")
  @@schema("public")
}

// ============================================================================
// ORG USER (Client User ↔ Organization mapping)
// ============================================================================

model OrgUser {
  id        String      @id @default(uuid()) @db.Uuid
  userId    String      @map("user_id") @db.Uuid
  orgId     String      @map("org_id") @db.Uuid
  firmId    String      @map("firm_id") @db.Uuid
  role      OrgUserRole @default(OWNER)
  createdAt DateTime    @default(now()) @map("created_at") @db.Timestamptz

  user         User         @relation(fields: [userId], references: [id])
  organization Organization @relation(fields: [orgId], references: [id])
  firm         Firm         @relation(fields: [firmId], references: [id])

  @@unique([userId, orgId])
  @@index([firmId])
  @@index([orgId])
  @@map("org_user")
  @@schema("public")
}

// ============================================================================
// SERVICE TEMPLATE
// ============================================================================

model ServiceTemplate {
  id                   String   @id @default(uuid()) @db.Uuid
  firmId               String   @map("firm_id") @db.Uuid
  name                 String   @db.VarChar(255)
  slug                 String   @db.VarChar(100)
  category             String   @db.VarChar(100)
  description          String?  @db.Text
  formSchema           Json     @default("[]") @map("form_schema")
  documentRequirements Json     @default("[]") @map("document_requirements")
  workflowConfig       Json     @default("{}") @map("workflow_config")
  slaConfig            Json     @default("{}") @map("sla_config")
  billingTemplate      Json?    @map("billing_template")
  validationRules      Json     @default("[]") @map("validation_rules")
  isActive             Boolean  @default(true) @map("is_active")
  version              Int      @default(1)
  createdAt            DateTime @default(now()) @map("created_at") @db.Timestamptz
  updatedAt            DateTime @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  firm     Firm      @relation(fields: [firmId], references: [id])
  cases    Case[]
  invoices Invoice[]

  @@unique([firmId, slug])
  @@index([firmId, isActive])
  @@index([firmId, category])
  @@map("service_template")
  @@schema("public")
}

// ============================================================================
// CASE (Central Business Entity)
// ============================================================================

model Case {
  id               String       @id @default(uuid()) @db.Uuid
  firmId           String       @map("firm_id") @db.Uuid
  caseNumber       String       @map("case_number") @db.VarChar(50)
  orgId            String       @map("org_id") @db.Uuid
  serviceId        String       @map("service_id") @db.Uuid
  createdByUserId  String       @map("created_by_user_id") @db.Uuid
  assignedToId     String?      @map("assigned_to_id") @db.Uuid

  // Status
  status           CaseStatus   @default(DRAFT)
  internalFlags    InternalFlag[] @map("internal_flags")
  priority         CasePriority @default(NORMAL)

  // Form data snapshot
  formData         Json         @default("{}") @map("form_data")

  // SLA
  slaDeadline      DateTime?    @map("sla_deadline") @db.Timestamptz
  slaBreached      Boolean      @default(false) @map("sla_breached")

  // Timestamps
  submittedAt      DateTime?    @map("submitted_at") @db.Timestamptz
  completedAt      DateTime?    @map("completed_at") @db.Timestamptz
  createdAt        DateTime     @default(now()) @map("created_at") @db.Timestamptz
  updatedAt        DateTime     @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  firm             Firm              @relation(fields: [firmId], references: [id])
  organization     Organization      @relation(fields: [orgId], references: [id])
  service          ServiceTemplate   @relation(fields: [serviceId], references: [id])
  createdBy        User              @relation("CaseCreator", fields: [createdByUserId], references: [id])
  assignedTo       EmployeeProfile?  @relation("CaseAssignee", fields: [assignedToId], references: [id])
  documents        CaseDocument[]
  transferLogs     CaseTransferLog[]
  chatRooms        ChatRoom[]
  invoice          Invoice?

  @@unique([firmId, caseNumber])
  @@index([firmId])
  @@index([firmId, orgId])
  @@index([firmId, assignedToId, status])
  @@index([firmId, status])
  @@map("case")
  @@schema("public")
}

// ============================================================================
// CASE DOCUMENT
// ============================================================================

model CaseDocument {
  id            String                @id @default(uuid()) @db.Uuid
  firmId        String                @map("firm_id") @db.Uuid
  caseId        String                @map("case_id") @db.Uuid
  uploadedBy    String                @map("uploaded_by") @db.Uuid

  fileName      String                @map("file_name") @db.VarChar(255)
  fileType      String                @map("file_type") @db.VarChar(50)
  fileSizeBytes BigInt                @map("file_size_bytes")
  mimeType      String                @map("mime_type") @db.VarChar(100)

  s3Bucket      String                @map("s3_bucket") @db.VarChar(100)
  s3Key         String                @map("s3_key") @db.VarChar(500)

  documentType  String                @map("document_type") @db.VarChar(50)
  securityLevel DocumentSecurityLevel @default(NORMAL) @map("security_level")

  description   String?               @db.Text
  isVerified    Boolean               @default(false) @map("is_verified")
  verifiedById  String?               @map("verified_by") @db.Uuid
  verifiedAt    DateTime?             @map("verified_at") @db.Timestamptz

  status        DocumentStatus        @default(ACTIVE)
  createdAt     DateTime              @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime              @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  firm          Firm              @relation(fields: [firmId], references: [id])
  case_         Case              @relation(fields: [caseId], references: [id])
  uploader      User              @relation("DocUploader", fields: [uploadedBy], references: [id])
  verifiedBy    EmployeeProfile?  @relation("DocVerifier", fields: [verifiedById], references: [id])

  @@index([firmId, caseId])
  @@index([firmId, securityLevel])
  @@map("case_document")
  @@schema("public")
}

// ============================================================================
// CASE TRANSFER LOG
// ============================================================================

model CaseTransferLog {
  id              String   @id @default(uuid()) @db.Uuid
  firmId          String   @map("firm_id") @db.Uuid
  caseId          String   @map("case_id") @db.Uuid
  fromEmployeeId  String   @map("from_employee_id") @db.Uuid
  toEmployeeId    String   @map("to_employee_id") @db.Uuid
  transferredBy   String   @map("transferred_by") @db.Uuid
  reason          String   @db.Text
  createdAt       DateTime @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  firm         Firm            @relation(fields: [firmId], references: [id])
  case_        Case            @relation(fields: [caseId], references: [id])
  fromEmployee EmployeeProfile @relation("TransferFrom", fields: [fromEmployeeId], references: [id])
  toEmployee   EmployeeProfile @relation("TransferTo", fields: [toEmployeeId], references: [id])

  @@index([caseId])
  @@index([firmId])
  @@map("case_transfer_log")
  @@schema("public")
}

// ============================================================================
// CHAT
// ============================================================================

model ChatRoom {
  id        String       @id @default(uuid()) @db.Uuid
  firmId    String       @map("firm_id") @db.Uuid
  caseId    String?      @map("case_id") @db.Uuid
  roomType  ChatRoomType @map("room_type")
  name      String?      @db.VarChar(255)
  isActive  Boolean      @default(true) @map("is_active")
  createdAt DateTime     @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  firm     Firm             @relation(fields: [firmId], references: [id])
  case_    Case?            @relation(fields: [caseId], references: [id])
  members  ChatRoomMember[]
  messages ChatMessage[]

  @@index([firmId, caseId])
  @@index([firmId, roomType])
  @@map("chat_room")
  @@schema("public")
}

model ChatRoomMember {
  id       String   @id @default(uuid()) @db.Uuid
  roomId   String   @map("room_id") @db.Uuid
  userId   String   @map("user_id") @db.Uuid
  role     String   @default("member") @db.VarChar(20)
  joinedAt DateTime @default(now()) @map("joined_at") @db.Timestamptz

  room ChatRoom @relation(fields: [roomId], references: [id])
  user User     @relation(fields: [userId], references: [id])

  @@unique([roomId, userId])
  @@map("chat_room_member")
  @@schema("public")
}

model ChatMessage {
  id          String      @id @default(uuid()) @db.Uuid
  roomId      String      @map("room_id") @db.Uuid
  senderId    String      @map("sender_id") @db.Uuid
  content     String      @db.Text
  messageType MessageType @default(TEXT) @map("message_type")
  metadata    Json?
  isEdited    Boolean     @default(false) @map("is_edited")
  createdAt   DateTime    @default(now()) @map("created_at") @db.Timestamptz
  updatedAt   DateTime    @updatedAt @map("updated_at") @db.Timestamptz

  room   ChatRoom @relation(fields: [roomId], references: [id])
  sender User     @relation(fields: [senderId], references: [id])

  @@index([roomId, createdAt(sort: Desc)])
  @@map("chat_message")
  @@schema("public")
}

// ============================================================================
// INVOICE
// ============================================================================

model Invoice {
  id            String        @id @default(uuid()) @db.Uuid
  firmId        String        @map("firm_id") @db.Uuid
  orgId         String        @map("org_id") @db.Uuid
  caseId        String        @unique @map("case_id") @db.Uuid  // 1:1 with Case
  serviceId     String        @map("service_id") @db.Uuid

  invoiceNumber String        @map("invoice_number") @db.VarChar(50)
  amount        Decimal       @db.Decimal(12, 2)
  taxBreakup    Json          @default("{}") @map("tax_breakup")
  totalAmount   Decimal       @map("total_amount") @db.Decimal(12, 2)
  currency      String        @default("INR") @db.VarChar(3)

  status        InvoiceStatus @default(DRAFT)
  issuedAt      DateTime?     @map("issued_at") @db.Timestamptz
  dueDate       DateTime?     @map("due_date") @db.Timestamptz
  paidAt        DateTime?     @map("paid_at") @db.Timestamptz

  notes         String?       @db.Text
  metadata      Json          @default("{}")

  createdAt     DateTime      @default(now()) @map("created_at") @db.Timestamptz
  updatedAt     DateTime      @updatedAt @map("updated_at") @db.Timestamptz

  // Relations
  firm         Firm            @relation(fields: [firmId], references: [id])
  organization Organization   @relation(fields: [orgId], references: [id])
  case_        Case           @relation(fields: [caseId], references: [id])
  service      ServiceTemplate @relation(fields: [serviceId], references: [id])

  @@unique([firmId, invoiceNumber])
  @@index([firmId, caseId])
  @@index([firmId, orgId])
  @@index([firmId, status])
  @@map("invoice")
  @@schema("public")
}

// ============================================================================
// NOTIFICATION
// ============================================================================

model Notification {
  id          String              @id @default(uuid()) @db.Uuid
  firmId      String              @map("firm_id") @db.Uuid
  userId      String              @map("user_id") @db.Uuid

  eventType   String              @map("event_type") @db.VarChar(50)
  title       String              @db.VarChar(255)
  body        String              @db.Text

  entityType  String?             @map("entity_type") @db.VarChar(50)
  entityId    String?             @map("entity_id") @db.Uuid

  channel     NotificationChannel
  isRead      Boolean             @default(false) @map("is_read")
  readAt      DateTime?           @map("read_at") @db.Timestamptz

  metadata    Json                @default("{}")
  createdAt   DateTime            @default(now()) @map("created_at") @db.Timestamptz

  // Relations
  firm Firm @relation(fields: [firmId], references: [id])
  user User @relation(fields: [userId], references: [id])

  @@index([firmId, userId, isRead, createdAt(sort: Desc)])
  @@map("notification")
  @@schema("public")
}

// ============================================================================
// AUDIT LOG (audit schema)
// ============================================================================

model AuditLog {
  id           String      @id @default(uuid()) @db.Uuid
  firmId       String      @map("firm_id") @db.Uuid
  actorId      String      @map("actor_id") @db.Uuid
  actorRole    String      @map("actor_role") @db.VarChar(30)

  entityType   String      @map("entity_type") @db.VarChar(50)
  entityId     String      @map("entity_id") @db.Uuid
  action       AuditAction

  beforeState  Json?       @map("before_state")
  afterState   Json?       @map("after_state")
  changeSummary String?    @map("change_summary") @db.Text

  ipAddress    String?     @map("ip_address") @db.VarChar(45)
  userAgent    String?     @map("user_agent") @db.Text
  requestId    String?     @map("request_id") @db.Uuid

  createdAt    DateTime    @default(now()) @map("created_at") @db.Timestamptz

  @@index([firmId, entityType, entityId, createdAt(sort: Desc)])
  @@index([firmId, actorId, createdAt(sort: Desc)])
  @@map("audit_log")
  @@schema("audit")
}

// ============================================================================
// VAULT ACCESS LOG (audit schema)
// ============================================================================

model VaultAccessLog {
  id         String      @id @default(uuid()) @db.Uuid
  firmId     String      @map("firm_id") @db.Uuid
  userId     String      @map("user_id") @db.Uuid
  documentId String      @map("document_id") @db.Uuid
  caseId     String      @map("case_id") @db.Uuid

  action     VaultAction
  ipAddress  String?     @map("ip_address") @db.VarChar(45)
  userAgent  String?     @map("user_agent") @db.Text
  sessionId  String?     @map("session_id") @db.VarChar(100)

  createdAt  DateTime    @default(now()) @map("created_at") @db.Timestamptz

  @@index([firmId, documentId, createdAt(sort: Desc)])
  @@index([firmId, userId, createdAt(sort: Desc)])
  @@map("vault_access_log")
  @@schema("audit")
}
```

---

## Form Schema JSON Structure

Stored in `ServiceTemplate.formSchema`:

```json
[
  {
    "fieldId": "company_name",
    "type": "text",
    "label": "Company Name",
    "placeholder": "Enter registered company name",
    "required": true,
    "validation": {
      "minLength": 3,
      "maxLength": 200,
      "pattern": "^[a-zA-Z0-9\\s]+$"
    },
    "order": 1,
    "section": "basic_info"
  },
  {
    "fieldId": "company_type",
    "type": "dropdown",
    "label": "Company Type",
    "required": true,
    "options": [
      { "value": "pvt_ltd", "label": "Private Limited" },
      { "value": "llp", "label": "LLP" },
      { "value": "opc", "label": "One Person Company" }
    ],
    "order": 2,
    "section": "basic_info"
  },
  {
    "fieldId": "incorporation_date",
    "type": "date",
    "label": "Date of Incorporation",
    "required": true,
    "validation": {
      "maxDate": "today"
    },
    "order": 3,
    "section": "basic_info"
  },
  {
    "fieldId": "authorized_capital",
    "type": "number",
    "label": "Authorized Capital (INR)",
    "required": true,
    "validation": {
      "min": 100000,
      "max": 999999999
    },
    "order": 4,
    "section": "financial"
  },
  {
    "fieldId": "is_listed",
    "type": "boolean",
    "label": "Is the company listed?",
    "required": false,
    "defaultValue": false,
    "order": 5,
    "section": "financial"
  }
]
```

## Document Requirements JSON Structure

Stored in `ServiceTemplate.documentRequirements`:

```json
[
  {
    "docTypeId": "pan_card",
    "label": "PAN Card of Directors",
    "required": true,
    "securityLevel": "SENSITIVE",
    "allowedMimeTypes": ["image/jpeg", "image/png", "application/pdf"],
    "maxSizeMb": 5,
    "description": "Clear scan of PAN card for all directors"
  },
  {
    "docTypeId": "moa",
    "label": "Memorandum of Association",
    "required": true,
    "securityLevel": "NORMAL",
    "allowedMimeTypes": ["application/pdf"],
    "maxSizeMb": 10,
    "description": "Signed MOA document"
  }
]
```

## SLA Config JSON Structure

Stored in `ServiceTemplate.slaConfig`:

```json
{
  "defaultDeadlineDays": 14,
  "escalationRules": [
    {
      "triggerAfterDays": 7,
      "action": "notify_manager",
      "notifyRoles": ["MANAGER", "ADMIN"]
    },
    {
      "triggerAfterDays": 12,
      "action": "escalate",
      "notifyRoles": ["MASTER_ADMIN"],
      "autoFlag": "COMPLIANCE_RISK"
    }
  ],
  "statusDeadlines": {
    "UNDER_REVIEW": 3,
    "DOCS_REQUIRED": 5,
    "PROCESSING": 10
  }
}
```
