// ---------------------------------------------------------------------------
// Environment URLs
// ---------------------------------------------------------------------------

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";

export const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3000";

// ---------------------------------------------------------------------------
// Case Status
// ---------------------------------------------------------------------------

export type CaseStatus =
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "DOCS_REQUIRED"
  | "PROCESSING"
  | "COMPLETED"
  | "REJECTED";

export const CASE_STATUS_COLORS: Record<CaseStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  SUBMITTED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  UNDER_REVIEW:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DOCS_REQUIRED:
    "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  PROCESSING:
    "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  COMPLETED:
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  REJECTED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export const CASE_STATUS_LABELS: Record<CaseStatus, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under Review",
  DOCS_REQUIRED: "Documents Required",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

/**
 * Allowed status transitions per current status (maps to the backend state machine).
 */
export const CASE_TRANSITIONS: Record<CaseStatus, CaseStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED"],
  UNDER_REVIEW: ["DOCS_REQUIRED", "PROCESSING", "REJECTED"],
  DOCS_REQUIRED: ["UNDER_REVIEW"],
  PROCESSING: ["COMPLETED", "DOCS_REQUIRED"],
  COMPLETED: [],
  REJECTED: [],
};

// ---------------------------------------------------------------------------
// Case Priority
// ---------------------------------------------------------------------------

export type CasePriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

export const PRIORITY_COLORS: Record<CasePriority, string> = {
  LOW: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  NORMAL: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  HIGH: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
  URGENT: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
};

// ---------------------------------------------------------------------------
// Invoice Status
// ---------------------------------------------------------------------------

export type InvoiceStatus =
  | "DRAFT"
  | "ISSUED"
  | "PAID"
  | "OVERDUE"
  | "CANCELLED";

export const INVOICE_STATUS_COLORS: Record<InvoiceStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  ISSUED: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  PAID: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  OVERDUE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  CANCELLED:
    "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300",
};

// ---------------------------------------------------------------------------
// Document Status
// ---------------------------------------------------------------------------

export type DocumentStatus = "ACTIVE" | "ARCHIVED" | "DELETED";

export const DOCUMENT_STATUS_COLORS: Record<DocumentStatus, string> = {
  ACTIVE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  ARCHIVED:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  DELETED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};
