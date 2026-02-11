"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/loading-skeleton";
import { ChevronLeft, ChevronRight, Inbox } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ColumnDef<T> {
  /** Column header text or custom renderer */
  header: string | (() => React.ReactNode);
  /** Dot-notation path to the value on each row (e.g. "organization.name") */
  accessorKey?: string;
  /** Custom cell renderer – receives the full row object */
  cell?: (row: T) => React.ReactNode;
  /** Optional extra className applied to both <th> and <td> */
  className?: string;
}

export interface DataTablePagination {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
}

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  pagination?: DataTablePagination;
  onPageChange?: (page: number) => void;
  onRowClick?: (row: T) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Resolve a dot-notation path on an object.
 * e.g. getNestedValue({ a: { b: "hello" } }, "a.b") => "hello"
 */
function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc !== null && acc !== undefined && typeof acc === "object") {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
}

// ---------------------------------------------------------------------------
// DataTable Component
// ---------------------------------------------------------------------------

export function DataTable<T>({
  columns,
  data,
  isLoading = false,
  pagination,
  onPageChange,
  emptyMessage = "No results found.",
  emptyIcon,
  onRowClick,
}: DataTableProps<T>) {
  // Pagination math
  const showFrom =
    pagination && pagination.total > 0
      ? (pagination.page - 1) * pagination.limit + 1
      : 0;
  const showTo =
    pagination
      ? Math.min(pagination.page * pagination.limit, pagination.total)
      : data.length;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      {/* ------------------------------------------------------------------ */}
      {/* Table                                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {/* ----- Header ------------------------------------------------- */}
          <thead className="bg-muted/50">
            <tr className="border-b">
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  className={cn(
                    "px-4 py-3 text-left font-medium text-muted-foreground whitespace-nowrap",
                    col.className
                  )}
                >
                  {typeof col.header === 'function' ? col.header() : col.header}
                </th>
              ))}
            </tr>
          </thead>

          {/* ----- Body --------------------------------------------------- */}
          <tbody>
            {/* Loading state – 5 skeleton rows */}
            {isLoading &&
              Array.from({ length: 5 }).map((_, rowIdx) => (
                <tr key={`skeleton-${rowIdx}`} className="border-b last:border-b-0">
                  {columns.map((col, colIdx) => (
                    <td
                      key={colIdx}
                      className={cn("px-4 py-3", col.className)}
                    >
                      <Skeleton
                        className={cn(
                          "h-4",
                          // Vary the widths so the skeleton looks natural
                          colIdx === 0
                            ? "w-3/4"
                            : colIdx === columns.length - 1
                              ? "w-1/3"
                              : "w-1/2"
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}

            {/* Empty state */}
            {!isLoading && data.length === 0 && (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={emptyIcon ?? <Inbox />}
                    title={emptyMessage}
                  />
                </td>
              </tr>
            )}

            {/* Data rows */}
            {!isLoading &&
              data.map((row, rowIdx) => (
                <tr
                  key={rowIdx}
                  onClick={() => onRowClick?.(row)}
                  className={cn(
                    "border-b last:border-b-0 transition-colors hover:bg-muted/50",
                    onRowClick && "cursor-pointer"
                  )}
                >
                  {columns.map((col, colIdx) => {
                    let cellContent: React.ReactNode;

                    if (col.cell) {
                      cellContent = col.cell(row);
                    } else if (col.accessorKey) {
                      const value = getNestedValue(row, col.accessorKey);
                      cellContent =
                        value !== null && value !== undefined
                          ? String(value)
                          : "—";
                    } else {
                      cellContent = "—";
                    }

                    return (
                      <td
                        key={colIdx}
                        className={cn(
                          "px-4 py-3 text-foreground",
                          col.className
                        )}
                      >
                        {cellContent}
                      </td>
                    );
                  })}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Pagination Footer                                                  */}
      {/* ------------------------------------------------------------------ */}
      {pagination && pagination.total > 0 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Showing{" "}
            <span className="font-medium text-foreground">{showFrom}</span> to{" "}
            <span className="font-medium text-foreground">{showTo}</span> of{" "}
            <span className="font-medium text-foreground">
              {pagination.total}
            </span>{" "}
            results
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
