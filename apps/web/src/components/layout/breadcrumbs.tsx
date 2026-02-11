'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Segment Label Map
// ---------------------------------------------------------------------------

/**
 * Mapping of URL path segments to human-readable labels.
 * Add entries here when new routes are introduced.
 */
const SEGMENT_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  cases: 'Cases',
  organizations: 'Organizations',
  services: 'Services',
  users: 'Users',
  audit: 'Audit Log',
  settings: 'Settings',
  notifications: 'Notifications',
  profile: 'Profile',
  'my-cases': 'My Cases',
  new: 'New',
  edit: 'Edit',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Detect UUID-like segments (standard v4 format or any 36-char hex-dash string).
 * These are replaced with "Details" in the breadcrumb trail.
 */
function isUuidSegment(segment: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    segment,
  );
}

/**
 * Convert a URL segment to a display label.
 *
 * Priority:
 * 1. Exact match in SEGMENT_LABELS
 * 2. UUID detection -> "Details"
 * 3. Capitalize each word (splitting on hyphens)
 */
function segmentToLabel(segment: string): string {
  if (SEGMENT_LABELS[segment]) {
    return SEGMENT_LABELS[segment];
  }

  if (isUuidSegment(segment)) {
    return 'Details';
  }

  // Fallback: capitalize words separated by hyphens
  return segment
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Breadcrumbs() {
  const pathname = usePathname();

  // Split the pathname and remove empty segments
  const segments = pathname.split('/').filter(Boolean);

  // If we're at the root dashboard with no segments, show just Home
  if (segments.length === 0) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center text-sm">
        <span className="text-muted-foreground">Home</span>
      </nav>
    );
  }

  // Build breadcrumb items with cumulative paths
  const breadcrumbs = segments.map((segment, index) => ({
    label: segmentToLabel(segment),
    href: '/' + segments.slice(0, index + 1).join('/'),
    isLast: index === segments.length - 1,
  }));

  return (
    <nav aria-label="Breadcrumb" className="flex items-center text-sm">
      <ol className="flex items-center gap-1.5">
        {/* Home link */}
        <li className="flex items-center gap-1.5">
          <Link
            href="/dashboard"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Home className="h-4 w-4" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {/* Path segments */}
        {breadcrumbs.map((crumb) => (
          <li key={crumb.href} className="flex items-center gap-1.5">
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60" />
            {crumb.isLast ? (
              <span
                className={cn(
                  'font-medium text-foreground',
                  'max-w-[200px] truncate',
                )}
                aria-current="page"
              >
                {crumb.label}
              </span>
            ) : (
              <Link
                href={crumb.href}
                className={cn(
                  'text-muted-foreground hover:text-foreground transition-colors',
                  'max-w-[200px] truncate',
                )}
              >
                {crumb.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
