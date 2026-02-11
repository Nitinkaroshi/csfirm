'use client';

import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Breadcrumbs } from '@/components/layout/breadcrumbs';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { NotificationBell } from '@/components/layout/notification-bell';
import { UserMenu } from '@/components/layout/user-menu';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopbarProps {
  /** Callback to toggle the mobile sidebar. */
  onMenuClick: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Topbar({ onMenuClick }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center border-b bg-background px-4 lg:px-6">
      {/* Left side: hamburger (mobile only) + breadcrumbs */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 lg:hidden"
          onClick={onMenuClick}
          aria-label="Toggle sidebar menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Vertical separator between hamburger and breadcrumbs on mobile */}
        <Separator orientation="vertical" className="h-6 lg:hidden" />

        <Breadcrumbs />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right side: actions */}
      <div className="flex items-center gap-1">
        <ThemeToggle />
        <NotificationBell />
        <UserMenu />
      </div>
    </header>
  );
}
