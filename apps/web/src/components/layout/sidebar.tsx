'use client';

import { useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Briefcase,
  Building2,
  Bell,
  FileText,
  Users,
  Shield,
  Settings,
  X,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuthStore } from '@/stores/auth-store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** If set, the link is only visible to staff with one of these roles. */
  staffRoles?: string[];
}

interface NavGroup {
  title?: string;
  items: NavItem[];
}

// ---------------------------------------------------------------------------
// Navigation Configuration
// ---------------------------------------------------------------------------

/**
 * Staff navigation items grouped by section.
 */
const STAFF_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Cases', href: '/cases', icon: Briefcase },
      { label: 'Organizations', href: '/organizations', icon: Building2 },
      { label: 'Notifications', href: '/notifications', icon: Bell },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Services',
        href: '/services',
        icon: FileText,
        staffRoles: ['ADMIN', 'MASTER_ADMIN'],
      },
      {
        label: 'Users',
        href: '/users',
        icon: Users,
        staffRoles: ['ADMIN', 'MASTER_ADMIN'],
      },
      {
        label: 'Audit Log',
        href: '/audit',
        icon: Shield,
        staffRoles: ['ADMIN', 'MASTER_ADMIN'],
      },
    ],
  },
  {
    items: [{ label: 'Settings', href: '/settings', icon: Settings }],
  },
];

/**
 * Client navigation items.
 */
const CLIENT_NAV: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'My Cases', href: '/cases', icon: Briefcase },
      { label: 'Compliance', href: '/compliance', icon: Shield },
      { label: 'Notifications', href: '/notifications', icon: Bell },
      { label: 'Settings', href: '/settings', icon: Settings },
    ],
  },
];

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  /** Whether the mobile sidebar overlay is open. */
  open: boolean;
  /** Callback to close the mobile sidebar overlay. */
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAuthStore((state) => state.user);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close on Escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when mobile sidebar is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  // ---------------------------------------------------------------------------
  // Determine nav items based on user type + role
  // ---------------------------------------------------------------------------

  const isStaff = user?.userType === 'STAFF';
  const navGroups = isStaff ? STAFF_NAV : CLIENT_NAV;

  /**
   * Check whether a nav item should be visible to the current user.
   */
  function isItemVisible(item: NavItem): boolean {
    // No role restriction -> visible to all
    if (!item.staffRoles || item.staffRoles.length === 0) return true;
    // Must be staff with a matching role
    if (!isStaff || !user?.staffRole) return false;
    return item.staffRoles.includes(user.staffRole);
  }

  /**
   * Check if a path is active. Matches exactly for /dashboard,
   * otherwise matches prefix (e.g. /cases matches /cases/123).
   */
  function isActive(href: string): boolean {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  // ---------------------------------------------------------------------------
  // Shared sidebar content
  // ---------------------------------------------------------------------------

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand / Logo */}
      <div className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
          CS
        </div>
        <span className="text-lg font-bold tracking-tight">CSFIRM</span>

        {/* Close button - mobile only */}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto h-8 w-8 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navGroups.map((group, groupIndex) => {
          const visibleItems = group.items.filter(isItemVisible);
          if (visibleItems.length === 0) return null;

          return (
            <div key={groupIndex} className="mb-2">
              {/* Group separator (not before the first group) */}
              {groupIndex > 0 && <Separator className="my-3" />}

              {/* Optional group title */}
              {group.title && (
                <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {group.title}
                </p>
              )}

              {/* Nav items */}
              <ul className="space-y-1">
                {visibleItems.map((item) => {
                  const active = isActive(item.href);
                  const Icon = item.icon;

                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          active
                            ? 'bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                        )}
                      >
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0',
                            active ? 'text-primary' : 'text-muted-foreground',
                          )}
                        />
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t px-4 py-3">
        <p className="text-xs text-muted-foreground">
          CSFIRM v1.0
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* Desktop sidebar - always visible, fixed width                       */}
      {/* ------------------------------------------------------------------ */}
      <aside className="hidden lg:flex lg:w-64 lg:shrink-0 lg:flex-col lg:border-r lg:bg-background">
        {sidebarContent}
      </aside>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile sidebar - overlay + slide-in                                 */}
      {/* ------------------------------------------------------------------ */}

      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/50 transition-opacity lg:hidden',
          open
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-in panel */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 bg-background shadow-xl transition-transform duration-300 ease-in-out lg:hidden',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
