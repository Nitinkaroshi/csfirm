'use client';

import { useAuthStore } from '@/stores/auth-store';
import { PageHeader } from '@/components/page-header';
import { StaffDashboard } from '@/components/dashboard/staff-dashboard';
import { ClientDashboard } from '@/components/dashboard/client-dashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const isStaff = user?.userType === 'STAFF';

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${user?.firstName || 'User'}`}
        description={isStaff ? 'Here\'s an overview of your firm\'s activity.' : 'Here\'s the status of your cases.'}
      />
      {isStaff ? <StaffDashboard /> : <ClientDashboard />}
    </div>
  );
}
