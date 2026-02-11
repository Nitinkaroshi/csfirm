import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CaseStatus, InvoiceStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboardMetrics(firmId: string) {
    const [
      totalCases,
      activeCases,
      totalRevenue,
      pendingRevenue,
      casesByStatus,
      recentActivity,
    ] = await Promise.all([
      this.prisma.case.count({ where: { firmId } }),
      this.prisma.case.count({
        where: { firmId, status: { in: [CaseStatus.PROCESSING, CaseStatus.DOCS_REQUIRED, CaseStatus.UNDER_REVIEW] } },
      }),
      this.prisma.invoice.aggregate({
        where: { firmId, status: InvoiceStatus.PAID },
        _sum: { totalAmount: true },
      }),
      this.prisma.invoice.aggregate({
        where: { firmId, status: InvoiceStatus.ISSUED },
        _sum: { totalAmount: true },
      }),
      this.getCasesByStatus(firmId),
      this.getRecentActivity(firmId),
    ]);

    return {
      totalCases,
      activeCases,
      closedCases: totalCases - activeCases,
      totalRevenue: totalRevenue._sum.totalAmount || 0,
      pendingRevenue: pendingRevenue._sum.totalAmount || 0,
      casesByStatus,
      recentActivity,
    };
  }

  async getCaseTrends(firmId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const cases = await this.prisma.case.groupBy({
      by: ['status'],
      where: {
        firmId,
        createdAt: { gte: startDate },
      },
      _count: true,
    });

    const casesByDay = await this.prisma.$queryRaw<Array<{ date: string; count: bigint }>>`
      SELECT DATE("createdAt") as date, COUNT(*)::int as count
      FROM "Case"
      WHERE "firmId" = ${firmId}
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return {
      byStatus: cases.map(c => ({ status: c.status, count: c._count })),
      byDay: casesByDay.map(d => ({ date: d.date, count: Number(d.count) })),
    };
  }

  async getRevenueTrends(firmId: string, months: number = 6) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenue = await this.prisma.$queryRaw<Array<{ month: string; revenue: number }>>`
      SELECT
        TO_CHAR("createdAt", 'YYYY-MM') as month,
        SUM("totalAmount")::float as revenue
      FROM "Invoice"
      WHERE "firmId" = ${firmId}
        AND "status" = ${InvoiceStatus.PAID}
        AND "createdAt" >= ${startDate}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month ASC
    `;

    return revenue;
  }

  async getEmployeePerformance(firmId: string) {
    const employees = await this.prisma.employeeProfile.findMany({
      where: { firmId },
      include: {
        user: { select: { firstName: true, lastName: true } },
        assignedCases: {
          select: {
            status: true,
            createdAt: true,
          },
        },
      },
    });

    return employees.map(emp => ({
      id: emp.userId,
      name: `${emp.user.firstName} ${emp.user.lastName}`,
      totalCases: emp.assignedCases.length,
      activeCases: emp.assignedCases.filter(c =>
        c.status === CaseStatus.PROCESSING || c.status === CaseStatus.DOCS_REQUIRED || c.status === CaseStatus.UNDER_REVIEW
      ).length,
      completedCases: emp.assignedCases.filter(c => c.status === CaseStatus.COMPLETED).length,
      maxCases: emp.maxCases,
      utilization: emp.maxCases > 0 ? (emp.assignedCases.length / emp.maxCases) * 100 : 0,
    }));
  }

  async getServiceMetrics(firmId: string) {
    const services = await this.prisma.serviceTemplate.findMany({
      where: { firmId, isActive: true },
      include: {
        cases: {
          select: { status: true, createdAt: true },
        },
      },
    });

    return services.map(service => ({
      id: service.id,
      name: service.name,
      totalCases: service.cases.length,
      activeCases: service.cases.filter(c =>
        c.status === CaseStatus.PROCESSING || c.status === CaseStatus.DOCS_REQUIRED || c.status === CaseStatus.UNDER_REVIEW
      ).length,
      completedCases: service.cases.filter(c => c.status === CaseStatus.COMPLETED).length,
    }));
  }

  private async getCasesByStatus(firmId: string) {
    const grouped = await this.prisma.case.groupBy({
      by: ['status'],
      where: { firmId },
      _count: true,
    });

    return grouped.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {} as Record<string, number>);
  }

  private async getRecentActivity(firmId: string, limit: number = 10) {
    const [cases, invoices] = await Promise.all([
      this.prisma.case.findMany({
        where: { firmId },
        orderBy: { updatedAt: 'desc' },
        take: limit / 2,
        select: {
          id: true,
          caseNumber: true,
          status: true,
          updatedAt: true,
          organization: { select: { name: true } },
        },
      }),
      this.prisma.invoice.findMany({
        where: { firmId },
        orderBy: { updatedAt: 'desc' },
        take: limit / 2,
        select: {
          id: true,
          invoiceNumber: true,
          status: true,
          updatedAt: true,
          totalAmount: true,
        },
      }),
    ]);

    const activities = [
      ...cases.map(c => ({
        type: 'case' as const,
        id: c.id,
        title: `Case ${c.caseNumber}`,
        description: `${c.organization.name} - ${c.status}`,
        timestamp: c.updatedAt,
      })),
      ...invoices.map(i => ({
        type: 'invoice' as const,
        id: i.id,
        title: `Invoice ${i.invoiceNumber}`,
        description: `₹${i.totalAmount.toFixed(2)} - ${i.status}`,
        timestamp: i.updatedAt,
      })),
    ];

    return activities
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
}
