import { Injectable } from '@nestjs/common';
import { Prisma, CaseStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const CASE_INCLUDE = {
  service: { select: { id: true, name: true, category: true } },
  organization: { select: { id: true, name: true, cin: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignedTo: {
    select: {
      id: true,
      user: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} satisfies Prisma.CaseInclude;

@Injectable()
export class CaseRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.case.findFirst({
      where: { id },
      include: CASE_INCLUDE,
    });
  }

  async findByNumber(caseNumber: string) {
    return this.prisma.case.findFirst({
      where: { caseNumber },
      include: CASE_INCLUDE,
    });
  }

  async findMany(params: {
    firmId: string;
    skip?: number;
    take?: number;
    where?: Prisma.CaseWhereInput;
    orderBy?: Prisma.CaseOrderByWithRelationInput;
  }) {
    const { firmId, skip = 0, take = 20, where = {}, orderBy = { createdAt: 'desc' } } = params;
    const fullWhere: Prisma.CaseWhereInput = { ...where, firmId };

    const [data, total] = await Promise.all([
      this.prisma.case.findMany({ where: fullWhere, skip, take, orderBy, include: CASE_INCLUDE }),
      this.prisma.case.count({ where: fullWhere }),
    ]);

    return { data, total, skip, take };
  }

  async findActiveByCaseWorker(employeeProfileId: string) {
    return this.prisma.case.findMany({
      where: {
        assignedToId: employeeProfileId,
        status: { notIn: [CaseStatus.COMPLETED, CaseStatus.REJECTED] },
      },
      include: CASE_INCLUDE,
    });
  }

  async countActiveByCaseWorker(employeeProfileId: string) {
    return this.prisma.case.count({
      where: {
        assignedToId: employeeProfileId,
        status: { notIn: [CaseStatus.COMPLETED, CaseStatus.REJECTED] },
      },
    });
  }

  async findByOrganization(organizationId: string, skip = 0, take = 20) {
    const fullWhere: Prisma.CaseWhereInput = { orgId: organizationId };
    const [data, total] = await Promise.all([
      this.prisma.case.findMany({ where: fullWhere, skip, take, orderBy: { createdAt: 'desc' }, include: CASE_INCLUDE }),
      this.prisma.case.count({ where: fullWhere }),
    ]);
    return { data, total, skip, take };
  }

  async create(data: Prisma.CaseCreateInput) {
    return this.prisma.case.create({ data, include: CASE_INCLUDE });
  }

  async update(id: string, data: Prisma.CaseUpdateInput) {
    return this.prisma.case.update({ where: { id }, data, include: CASE_INCLUDE });
  }

  async generateCaseNumber(firmId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.case.count({
      where: {
        firmId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `CS-${year}-${seq}`;
  }
}
