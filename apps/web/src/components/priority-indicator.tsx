import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// PriorityIndicator
// ---------------------------------------------------------------------------

const PRIORITY_DOT_COLORS: Record<string, string> = {
  LOW: "bg-green-500",
  NORMAL: "bg-blue-500",
  HIGH: "bg-orange-500",
  URGENT: "bg-red-500",
};

const PRIORITY_LABEL_MAP: Record<string, string> = {
  LOW: "Low",
  NORMAL: "Normal",
  HIGH: "High",
  URGENT: "Urgent",
};

interface PriorityIndicatorProps {
  priority: string; // LOW | NORMAL | HIGH | URGENT
  showLabel?: boolean;
  className?: string;
}

export function PriorityIndicator({
  priority,
  showLabel = false,
  className,
}: PriorityIndicatorProps) {
  const upper = priority.toUpperCase();
  const dotColor = PRIORITY_DOT_COLORS[upper] || "bg-gray-400";
  const label = PRIORITY_LABEL_MAP[upper] || priority;

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span
        className={cn("inline-block h-2.5 w-2.5 rounded-full", dotColor)}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="text-sm text-foreground">{label}</span>
      )}
    </span>
  );
}
