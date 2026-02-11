// Re-export Prisma enums for cross-package usage
// These mirror the Prisma schema enums for use in packages that don't depend on @prisma/client

export enum UserType {
  STAFF = 'STAFF',
  CLIENT = 'CLIENT',
}

export enum FirmStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  TRIAL = 'TRIAL',
}

export enum StaffRole {
  MASTER_ADMIN = 'MASTER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  EMPLOYEE = 'EMPLOYEE',
}

export enum OrgUserRole {
  DIRECTOR = 'DIRECTOR',
  SECRETARY = 'SECRETARY',
  AUTHORIZED_REP = 'AUTHORIZED_REP',
  VIEWER = 'VIEWER',
}

export enum CaseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  DOCS_REQUIRED = 'DOCS_REQUIRED',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
}

export enum CasePriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  URGENT = 'URGENT',
}

export enum InternalFlag {
  VIP_CLIENT = 'VIP_CLIENT',
  ESCALATED = 'ESCALATED',
  SLA_WARNING = 'SLA_WARNING',
  SLA_BREACHED = 'SLA_BREACHED',
  COMPLIANCE_RISK = 'COMPLIANCE_RISK',
}

export enum DocumentSecurityLevel {
  LEVEL_1 = 'LEVEL_1',
  LEVEL_2 = 'LEVEL_2',
}

export enum DocumentStatus {
  PENDING = 'PENDING',
  UPLOADED = 'UPLOADED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

export enum ChatRoomType {
  CLIENT_FACING = 'CLIENT_FACING',
  INTERNAL = 'INTERNAL',
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  PUSH = 'PUSH',
}

export enum VaultAction {
  UNLOCK = 'UNLOCK',
  LOCK = 'LOCK',
  ACCESS = 'ACCESS',
  DOWNLOAD = 'DOWNLOAD',
}

export enum AuditAction {
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  EXPORT = 'EXPORT',
  STATUS_CHANGE = 'STATUS_CHANGE',
  ASSIGNMENT = 'ASSIGNMENT',
  TRANSFER = 'TRANSFER',
}
