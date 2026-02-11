"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  CASE_STATUS_COLORS,
  CASE_STATUS_LABELS,
  INVOICE_STATUS_COLORS,
  DOCUMENT_STATUS_COLORS,
  PRIORITY_COLORS,
  type CaseStatus,
  type InvoiceStatus,
  type DocumentStatus,
  type CasePriority,
} from "@/lib/constants";

// ---------------------------------------------------------------------------
// StatusBadge
// ---------------------------------------------------------------------------

interface StatusBadgeProps {
  status: string;
  type?: "case" | "invoice" | "document" | "priority";
  className?: string;
}

/**
 * Resolves the tailwind color classes for a given status + type combination.
 */
function getColorClasses(status: string, type: StatusBadgeProps["type"]): string {
  switch (type) {
    case "invoice":
      return (
        INVOICE_STATUS_COLORS[status as InvoiceStatus] ??
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      );
    case "document":
      return (
        DOCUMENT_STATUS_COLORS[status as DocumentStatus] ??
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      );
    case "priority":
      return (
        PRIORITY_COLORS[status as CasePriority] ??
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      );
    case "case":
    default:
      return (
        CASE_STATUS_COLORS[status as CaseStatus] ??
        "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
      );
  }
}

/**
 * Resolves a human-readable label for the status.
 * Case statuses use the dedicated label map; others fall back to
 * title-casing the raw status string.
 */
function getLabel(status: string, type: StatusBadgeProps["type"]): string {
  if (type === "case" || type === undefined) {
    const caseLabel = CASE_STATUS_LABELS[status as CaseStatus];
    if (caseLabel) return caseLabel;
  }

  // Fallback: turn "UNDER_REVIEW" -> "Under Review"
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StatusBadge({ status, type = "case", className }: StatusBadgeProps) {
  const colorClasses = getColorClasses(status, type);
  const label = getLabel(status, type);

  return (
    <Badge
      variant="outline"
      className={cn("border-transparent font-medium", colorClasses, className)}
    >
      {label}
    </Badge>
  );
}
