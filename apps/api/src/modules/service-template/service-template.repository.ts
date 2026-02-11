import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class ServiceTemplateRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.serviceTemplate.findFirst({ where: { id } });
  }

  async findMany(params: {
    firmId: string;
    skip?: number;
    take?: number;
    where?: Prisma.ServiceTemplateWhereInput;
    orderBy?: Prisma.ServiceTemplateOrderByWithRelationInput;
  }) {
    const { firmId, skip = 0, take = 20, where = {}, orderBy = { createdAt: 'desc' } } = params;
    const fullWhere: Prisma.ServiceTemplateWhereInput = { ...where, firmId };

    const [data, total] = await Promise.all([
      this.prisma.serviceTemplate.findMany({ where: fullWhere, skip, take, orderBy }),
      this.prisma.serviceTemplate.count({ where: fullWhere }),
    ]);

    return { data, total, skip, take };
  }

  async findActiveByFirm(firmId: string) {
    return this.prisma.serviceTemplate.findMany({
      where: { firmId, isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async create(data: Prisma.ServiceTemplateCreateInput) {
    return this.prisma.serviceTemplate.create({ data });
  }

  async update(id: string, data: Prisma.ServiceTemplateUpdateInput) {
    return this.prisma.serviceTemplate.update({ where: { id }, data });
  }

  async delete(id: string) {
    return this.prisma.serviceTemplate.update({ where: { id }, data: { isActive: false } });
  }
}
