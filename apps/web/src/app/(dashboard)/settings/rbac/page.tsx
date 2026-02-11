'use client';

import { useState } from 'react';
import { Shield, Users, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useEmployees, useUpdateEmployee } from '@/hooks/use-employees';

const ROLE_HIERARCHY = {
  MASTER_ADMIN: {
    level: 4,
    name: 'Master Admin',
    description: 'Full system access including tenant management',
    color: 'bg-purple-500',
  },
  ADMIN: {
    level: 3,
    name: 'Admin',
    description: 'Full firm access except tenant settings',
    color: 'bg-red-500',
  },
  MANAGER: {
    level: 2,
    name: 'Manager',
    description: 'Case management and team oversight',
    color: 'bg-blue-500',
  },
  EMPLOYEE: {
    level: 1,
    name: 'Employee',
    description: 'Basic case handling and document access',
    color: 'bg-green-500',
  },
};

const FEATURE_PERMISSIONS = [
  {
    category: 'Tenant Management',
    features: [
      { name: 'Create/Edit Firms', employee: false, manager: false, admin: false, master: true },
      { name: 'View All Tenants', employee: false, manager: false, admin: false, master: true },
    ],
  },
  {
    category: 'User Management',
    features: [
      { name: 'Create Staff Users', employee: false, manager: false, admin: true, master: true },
      { name: 'Edit User Profiles', employee: false, manager: false, admin: true, master: true },
      { name: 'Delete Users', employee: false, manager: false, admin: true, master: true },
      { name: 'View Staff List', employee: true, manager: true, admin: true, master: true },
    ],
  },
  {
    category: 'Case Management',
    features: [
      { name: 'Create Cases', employee: false, manager: true, admin: true, master: true },
      { name: 'Assign Cases', employee: false, manager: true, admin: true, master: true },
      { name: 'Transfer Cases', employee: false, manager: true, admin: true, master: true },
      { name: 'Cancel Cases', employee: false, manager: false, admin: true, master: true },
      { name: 'Bulk Assign Cases', employee: false, manager: true, admin: true, master: true },
      { name: 'Bulk Update Status', employee: false, manager: true, admin: true, master: true },
      { name: 'Add Case Flags', employee: true, manager: true, admin: true, master: true },
      { name: 'Remove Case Flags', employee: false, manager: true, admin: true, master: true },
    ],
  },
  {
    category: 'Documents',
    features: [
      { name: 'Upload Documents', employee: true, manager: true, admin: true, master: true },
      { name: 'Delete Documents', employee: false, manager: true, admin: true, master: true },
      { name: 'Access Vault', employee: true, manager: true, admin: true, master: true },
    ],
  },
  {
    category: 'Invoices',
    features: [
      { name: 'Create Invoices', employee: false, manager: true, admin: true, master: true },
      { name: 'Issue Invoices', employee: false, manager: true, admin: true, master: true },
      { name: 'Mark as Paid', employee: false, manager: true, admin: true, master: true },
      { name: 'Cancel Invoices', employee: false, manager: false, admin: true, master: true },
    ],
  },
  {
    category: 'Analytics',
    features: [
      { name: 'Dashboard Metrics', employee: false, manager: true, admin: true, master: true },
      { name: 'Case Trends', employee: false, manager: true, admin: true, master: true },
      { name: 'Revenue Trends', employee: false, manager: false, admin: true, master: true },
      { name: 'Employee Performance', employee: false, manager: true, admin: true, master: true },
    ],
  },
  {
    category: 'Organizations',
    features: [
      { name: 'Create Organizations', employee: false, manager: true, admin: true, master: true },
      { name: 'Edit Organizations', employee: false, manager: true, admin: true, master: true },
    ],
  },
  {
    category: 'Service Templates',
    features: [
      { name: 'Create Templates', employee: false, manager: false, admin: true, master: true },
      { name: 'Edit Templates', employee: false, manager: false, admin: true, master: true },
    ],
  },
];

export default function RBACPage() {
  const { data: employeesData } = useEmployees({ limit: 100 });
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [newRole, setNewRole] = useState('');
  const updateEmployee = useUpdateEmployee();

  const handleUpdateRole = async () => {
    if (!selectedEmployee || !newRole) return;
    await updateEmployee.mutateAsync({
      id: selectedEmployee.id,
      data: { staffRole: newRole },
    });
    setSelectedEmployee(null);
    setNewRole('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Role-Based Access Control</h1>
        <p className="text-muted-foreground">Manage permissions and role assignments</p>
      </div>

      <Tabs defaultValue="hierarchy" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hierarchy">Role Hierarchy</TabsTrigger>
          <TabsTrigger value="permissions">Feature Permissions</TabsTrigger>
          <TabsTrigger value="users">User Assignments</TabsTrigger>
        </TabsList>

        {/* Role Hierarchy Tab */}
        <TabsContent value="hierarchy">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Object.entries(ROLE_HIERARCHY)
              .sort((a, b) => b[1].level - a[1].level)
              .map(([key, role]) => (
                <Card key={key}>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <div className={`h-3 w-3 rounded-full ${role.color}`} />
                      <CardTitle className="text-lg">{role.name}</CardTitle>
                    </div>
                    <CardDescription>Level {role.level}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{role.description}</p>
                    <div className="mt-4">
                      <Badge variant="outline">{key}</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>

          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Role Inheritance</CardTitle>
              <CardDescription>Higher-level roles inherit all permissions from lower levels</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  <span>EMPLOYEE</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-500" />
                  <span>MANAGER</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-red-500" />
                  <span>ADMIN</span>
                </div>
                <span className="text-muted-foreground">→</span>
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-purple-500" />
                  <span>MASTER_ADMIN</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Permissions Tab */}
        <TabsContent value="permissions">
          <Card>
            <CardHeader>
              <CardTitle>Feature Access Matrix</CardTitle>
              <CardDescription>Which roles can access each feature</CardDescription>
            </CardHeader>
            <CardContent>
              {FEATURE_PERMISSIONS.map((category) => (
                <div key={category.category} className="mb-8 last:mb-0">
                  <h3 className="mb-3 font-semibold text-lg">{category.category}</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Feature</TableHead>
                        <TableHead className="text-center">Employee</TableHead>
                        <TableHead className="text-center">Manager</TableHead>
                        <TableHead className="text-center">Admin</TableHead>
                        <TableHead className="text-center">Master</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {category.features.map((feature) => (
                        <TableRow key={feature.name}>
                          <TableCell>{feature.name}</TableCell>
                          <TableCell className="text-center">
                            {feature.employee ? (
                              <CheckCircle className="inline h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="inline h-5 w-5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {feature.manager ? (
                              <CheckCircle className="inline h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="inline h-5 w-5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {feature.admin ? (
                              <CheckCircle className="inline h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="inline h-5 w-5 text-muted-foreground" />
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {feature.master ? (
                              <CheckCircle className="inline h-5 w-5 text-green-500" />
                            ) : (
                              <XCircle className="inline h-5 w-5 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Assignments Tab */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>User Role Assignments</CardTitle>
              <CardDescription>Manage staff role assignments for your firm</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Current Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(employeesData?.data || []).map((emp: any) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">
                        {emp.firstName} {emp.lastName}
                      </TableCell>
                      <TableCell>{emp.user?.email}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            emp.staffRole === 'MASTER_ADMIN'
                              ? 'bg-purple-500'
                              : emp.staffRole === 'ADMIN'
                                ? 'bg-red-500'
                                : emp.staffRole === 'MANAGER'
                                  ? 'bg-blue-500'
                                  : 'bg-green-500'
                          }
                        >
                          {emp.staffRole}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.user?.status === 'ACTIVE' ? (
                          <Badge variant="outline" className="text-green-600">
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-gray-600">
                            {emp.user?.status}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedEmployee(emp);
                                setNewRole(emp.staffRole);
                              }}
                            >
                              Change Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change User Role</DialogTitle>
                              <DialogDescription>
                                Update the role for {emp.firstName} {emp.lastName}
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div>
                                <Label>Current Role</Label>
                                <p className="text-sm text-muted-foreground">{emp.staffRole}</p>
                              </div>
                              <div>
                                <Label>New Role</Label>
                                <Select value={newRole} onValueChange={setNewRole}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select role" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="EMPLOYEE">Employee</SelectItem>
                                    <SelectItem value="MANAGER">Manager</SelectItem>
                                    <SelectItem value="ADMIN">Admin</SelectItem>
                                    <SelectItem value="MASTER_ADMIN">Master Admin</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedEmployee(null);
                                  setNewRole('');
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleUpdateRole}
                                disabled={!newRole || newRole === emp.staffRole || updateEmployee.isPending}
                              >
                                {updateEmployee.isPending ? 'Updating...' : 'Update Role'}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
