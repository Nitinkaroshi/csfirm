import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Skeleton – base primitive
// ---------------------------------------------------------------------------

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}

// ---------------------------------------------------------------------------
// SkeletonText – multiple lines of varying width
// ---------------------------------------------------------------------------

interface SkeletonTextProps {
  lines?: number;
  className?: string;
}

export function SkeletonText({ lines = 3, className }: SkeletonTextProps) {
  // Varying widths to make the skeleton look more realistic
  const widths = ["w-full", "w-5/6", "w-4/6", "w-3/4", "w-2/3"];

  return (
    <div className={cn("space-y-2", className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn("h-4", widths[i % widths.length])}
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonCard – card-shaped skeleton placeholder
// ---------------------------------------------------------------------------

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 shadow-sm space-y-4",
        className
      )}
    >
      {/* Header area */}
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-3 w-1/4" />
        </div>
      </div>
      {/* Body lines */}
      <SkeletonText lines={3} />
      {/* Footer area */}
      <div className="flex items-center justify-between pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-24" />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SkeletonTable – table layout skeleton with N rows
// ---------------------------------------------------------------------------

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function SkeletonTable({
  rows = 5,
  columns = 4,
  className,
}: SkeletonTableProps) {
  // Varying widths per column to look more realistic
  const colWidths = ["w-1/4", "w-1/3", "w-1/2", "w-2/5", "w-1/5", "w-3/5"];

  return (
    <div className={cn("w-full", className)}>
      <table className="w-full">
        {/* Header skeleton */}
        <thead>
          <tr className="border-b">
            {Array.from({ length: columns }).map((_, colIdx) => (
              <th key={colIdx} className="px-4 py-3 text-left">
                <Skeleton className="h-4 w-20" />
              </th>
            ))}
          </tr>
        </thead>
        {/* Body skeleton */}
        <tbody>
          {Array.from({ length: rows }).map((_, rowIdx) => (
            <tr key={rowIdx} className="border-b last:border-b-0">
              {Array.from({ length: columns }).map((_, colIdx) => (
                <td key={colIdx} className="px-4 py-3">
                  <Skeleton
                    className={cn(
                      "h-4",
                      colWidths[(rowIdx + colIdx) % colWidths.length]
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
