// ---------------------------------------------------------------------------
// Enums / Literal Types
// ---------------------------------------------------------------------------

export type UserType = "FIRM_ADMIN" | "EMPLOYEE" | "ORG_USER";
export type UserStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type EmployeeRole = "ADMIN" | "MANAGER" | "OPERATOR" | "VIEWER";
export type OrgType = "PRIVATE_LIMITED" | "PUBLIC_LIMITED" | "LLP" | "PARTNERSHIP" | "PROPRIETORSHIP" | "TRUST" | "SOCIETY" | "OTHER";
export type OrgStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type OrgUserRole = "OWNER" | "ADMIN" | "MEMBER";
export type ServiceCategory = "COMPLIANCE" | "TAX" | "LEGAL" | "AUDIT" | "ADVISORY" | "OTHER";
export type CaseStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "DOCS_REQUIRED" | "PROCESSING" | "COMPLETED" | "REJECTED" | "CANCELLED";
export type CasePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";
export type SecurityLevel = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";
export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";
export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "OVERDUE" | "CANCELLED";
export type ChatRoomType = "INTERNAL" | "CLIENT";
export type MessageType = "TEXT" | "SYSTEM" | "FILE";

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export interface User {
  id: string;
  firmId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  userType: UserType;
  status: UserStatus;
  lastLoginAt: string | null;
  employeeProfile?: EmployeeProfile;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Employee Profile
// ---------------------------------------------------------------------------

export interface EmployeeProfile {
  id: string;
  userId: string;
  firmId: string;
  role: EmployeeRole;
  department: string | null;
  designation: string | null;
  maxCases: number;
  activeCases: number;
  specializations: string[];
  isAvailable: boolean;
}

// ---------------------------------------------------------------------------
// Organization
// ---------------------------------------------------------------------------

export interface Organization {
  id: string;
  firmId: string;
  name: string;
  type: OrgType;
  cin: string | null;
  pan: string | null;
  gst: string | null;
  registeredAddress: string | null;
  contactInfo: Record<string, unknown> | null;
  status: OrgStatus;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Organization User
// ---------------------------------------------------------------------------

export interface OrgUser {
  id: string;
  userId: string;
  orgId: string;
  firmId: string;
  role: OrgUserRole;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Service Template
// ---------------------------------------------------------------------------

export interface ServiceTemplate {
  id: string;
  firmId: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  description: string | null;
  formSchema: Record<string, unknown>;
  documentRequirements: Record<string, unknown>[];
  slaConfig: {
    defaultDays: number;
    warningDays: number;
    [key: string]: unknown;
  };
  billingTemplate: {
    baseAmount: number;
    currency: string;
    taxRate: number;
    [key: string]: unknown;
  };
  isActive: boolean;
  version: number;
}

// ---------------------------------------------------------------------------
// Case
// ---------------------------------------------------------------------------

export interface Case {
  id: string;
  firmId: string;
  caseNumber: string;
  status: CaseStatus;
  priority: CasePriority;
  orgId: string;
  serviceId: string;
  assignedToId: string | null;
  createdByUserId: string;
  formData: Record<string, unknown>;
  internalFlags: Record<string, unknown> | null;
  slaDeadline: string | null;
  slaBreached: boolean;
  submittedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;

  // Relations (optionally populated)
  organization?: Organization;
  service?: ServiceTemplate;
  assignedTo?: User;
  createdBy?: User;
}

// ---------------------------------------------------------------------------
// Case Document
// ---------------------------------------------------------------------------

export interface CaseDocument {
  id: string;
  caseId: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSizeBytes: number;
  s3Key: string;
  s3Bucket: string;
  documentType: string;
  securityLevel: SecurityLevel;
  status: DocumentStatus;
  uploadedBy: string;
  verifiedById: string | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Invoice
// ---------------------------------------------------------------------------

export interface Invoice {
  id: string;
  firmId: string;
  invoiceNumber: string;
  caseId: string;
  orgId: string;
  serviceId: string;
  amount: number;
  taxBreakup: {
    cgst: number;
    sgst: number;
    igst: number;
    [key: string]: unknown;
  };
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

export interface ChatRoom {
  id: string;
  caseId: string;
  roomType: ChatRoomType;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  userId: string;
  content: string;
  messageType: MessageType;
  createdAt: string;

  // Optionally populated
  user?: Pick<User, "id" | "firstName" | "lastName" | "email" | "userType">;
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export interface Notification {
  id: string;
  userId: string;
  firmId: string;
  title: string;
  message: string;
  eventType: string;
  isRead: boolean;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export interface AuditLog {
  id: string;
  firmId: string;
  entityType: string;
  entityId: string;
  action: string;
  actorId: string;
  changes: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API Response Wrappers
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  code: string;
  message: string;
}
