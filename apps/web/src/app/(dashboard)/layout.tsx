'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';

// ---------------------------------------------------------------------------
// Dashboard Layout
// ---------------------------------------------------------------------------

/**
 * Root layout for all authenticated dashboard pages.
 *
 * Structure:
 * ┌──────────┬──────────────────────────────────────┐
 * │          │  Topbar (h-16)                        │
 * │ Sidebar  ├──────────────────────────────────────┤
 * │ (w-64)   │  Scrollable content area              │
 * │          │                                        │
 * │          │                                        │
 * └──────────┴──────────────────────────────────────┘
 *
 * On mobile the sidebar is hidden and toggled via a hamburger menu
 * that renders it as a slide-in overlay.
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar: fixed 256px on desktop, slide-in overlay on mobile */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main area: topbar + scrollable content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar */}
        <Topbar onMenuClick={() => setSidebarOpen(true)} />

        {/* Content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
