'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDashboardMetrics,
  useCaseTrends,
  useRevenueTrends,
  useEmployeePerformance,
  useServiceMetrics,
} from '@/hooks/use-analytics';
import { formatCurrency } from '@/lib/utils';

// Lazy load Recharts to reduce bundle size (2384 modules -> ~400 modules)
const BarChart = dynamic(() => import('recharts').then(mod => ({ default: mod.BarChart })), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => ({ default: mod.Bar })), { ssr: false });
const LineChart = dynamic(() => import('recharts').then(mod => ({ default: mod.LineChart })), { ssr: false });
const Line = dynamic(() => import('recharts').then(mod => ({ default: mod.Line })), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.XAxis })), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => ({ default: mod.YAxis })), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => ({ default: mod.CartesianGrid })), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => ({ default: mod.Tooltip })), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => ({ default: mod.Legend })), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => ({ default: mod.ResponsiveContainer })), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => ({ default: mod.PieChart })), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => ({ default: mod.Pie })), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => ({ default: mod.Cell })), { ssr: false });

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#9ca3af',
  SUBMITTED: '#3b82f6',
  PROCESSING: '#f59e0b',
  DOCS_REQUIRED: '#8b5cf6',
  UNDER_REVIEW: '#06b6d4',
  COMPLETED: '#10b981',
  REJECTED: '#ef4444',
};

export default function AnalyticsPage() {
  const [caseTrendsDays, setCaseTrendsDays] = useState(30);
  const [revenueMonths, setRevenueMonths] = useState(6);

  const { data: dashboard, isLoading: loadingDashboard } = useDashboardMetrics();
  const { data: caseTrends, isLoading: loadingTrends } = useCaseTrends(caseTrendsDays);
  const { data: revenue, isLoading: loadingRevenue } = useRevenueTrends(revenueMonths);
  const { data: employees, isLoading: loadingEmployees } = useEmployeePerformance();
  const { data: services, isLoading: loadingServices } = useServiceMetrics();

  if (loadingDashboard) {
    return (
      <div className="flex h-96 items-center justify-center">
        <div className="text-muted-foreground">Loading analytics...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive insights into your firm's operations</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalCases || 0}</div>
            <p className="text-xs text-muted-foreground">{dashboard?.activeCases || 0} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.totalRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">All-time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Paid Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.paidRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboard?.totalRevenue
                ? `${Math.round((dashboard.paidRevenue / dashboard.totalRevenue) * 100)}% collected`
                : '0% collected'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pending Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboard?.pendingRevenue || 0)}</div>
            <p className="text-xs text-muted-foreground">Awaiting payment</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Tabs */}
      <Tabs defaultValue="cases" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cases">Case Trends</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="employees">Employee Performance</TabsTrigger>
          <TabsTrigger value="services">Service Metrics</TabsTrigger>
        </TabsList>

        {/* Case Trends Tab */}
        <TabsContent value="cases" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Case Trends by Status</CardTitle>
              <CardDescription>Daily case submissions over the last {caseTrendsDays} days</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingTrends ? (
                <div className="flex h-80 items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={caseTrends?.byDay || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    {Object.keys(STATUS_COLORS).map((status) => (
                      <Line
                        key={status}
                        type="monotone"
                        dataKey={status}
                        stroke={STATUS_COLORS[status]}
                        strokeWidth={2}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cases by Status</CardTitle>
              <CardDescription>Current distribution of case statuses</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDashboard ? (
                <div className="flex h-80 items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={dashboard?.casesByStatus || []}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {(dashboard?.casesByStatus || []).map((entry: any) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Trends</CardTitle>
              <CardDescription>Monthly revenue over the last {revenueMonths} months</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRevenue ? (
                <div className="flex h-96 items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={revenue || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                    <Legend />
                    <Bar dataKey="revenue" fill="#10b981" name="Revenue (Paid Invoices)" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employee Performance Tab */}
        <TabsContent value="employees">
          <Card>
            <CardHeader>
              <CardTitle>Employee Performance</CardTitle>
              <CardDescription>Case workload and completion metrics per employee</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingEmployees ? (
                <div className="flex h-96 items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <div className="space-y-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={employees || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="employeeName" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="totalCases" fill="#3b82f6" name="Total Cases" />
                      <Bar dataKey="activeCases" fill="#f59e0b" name="Active Cases" />
                      <Bar dataKey="completedCases" fill="#10b981" name="Completed Cases" />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="p-2 text-left">Employee</th>
                          <th className="p-2 text-right">Total</th>
                          <th className="p-2 text-right">Active</th>
                          <th className="p-2 text-right">Completed</th>
                          <th className="p-2 text-right">Utilization</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(employees || []).map((emp: any) => (
                          <tr key={emp.employeeId} className="border-b">
                            <td className="p-2">{emp.employeeName}</td>
                            <td className="p-2 text-right">{emp.totalCases}</td>
                            <td className="p-2 text-right">{emp.activeCases}</td>
                            <td className="p-2 text-right">{emp.completedCases}</td>
                            <td className="p-2 text-right">{emp.utilization}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Service Metrics Tab */}
        <TabsContent value="services">
          <Card>
            <CardHeader>
              <CardTitle>Service Metrics</CardTitle>
              <CardDescription>Case distribution by service type</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingServices ? (
                <div className="flex h-96 items-center justify-center text-muted-foreground">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={services || []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="serviceName" type="category" width={200} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="caseCount" fill="#8b5cf6" name="Total Cases" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
