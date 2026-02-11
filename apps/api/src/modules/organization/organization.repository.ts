import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

const ORG_INCLUDE = {
  orgUsers: {
    include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
  },
} satisfies Prisma.OrganizationInclude;

@Injectable()
export class OrganizationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.organization.findFirst({ where: { id }, include: ORG_INCLUDE });
  }

  async findMany(params: {
    firmId: string;
    skip?: number;
    take?: number;
    where?: Prisma.OrganizationWhereInput;
    orderBy?: Prisma.OrganizationOrderByWithRelationInput;
  }) {
    const { firmId, skip = 0, take = 20, where = {}, orderBy = { createdAt: 'desc' } } = params;
    const fullWhere: Prisma.OrganizationWhereInput = { ...where, firmId };

    const [data, total] = await Promise.all([
      this.prisma.organization.findMany({ where: fullWhere, skip, take, orderBy, include: ORG_INCLUDE }),
      this.prisma.organization.count({ where: fullWhere }),
    ]);

    return { data, total, skip, take };
  }

  async create(data: Prisma.OrganizationCreateInput) {
    return this.prisma.organization.create({ data, include: ORG_INCLUDE });
  }

  async update(id: string, data: Prisma.OrganizationUpdateInput) {
    return this.prisma.organization.update({ where: { id }, data, include: ORG_INCLUDE });
  }

  async delete(id: string) {
    return this.prisma.organization.delete({ where: { id } });
  }
}
