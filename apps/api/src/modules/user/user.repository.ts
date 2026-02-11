import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findFirst({
      where: { id },
      include: { employeeProfile: true },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email },
      include: { employeeProfile: true },
    });
  }

  async findMany(params: {
    firmId: string;
    skip?: number;
    take?: number;
    where?: Prisma.UserWhereInput;
    orderBy?: Prisma.UserOrderByWithRelationInput;
  }) {
    const { firmId, skip = 0, take = 20, where = {}, orderBy = { createdAt: 'desc' } } = params;

    const fullWhere: Prisma.UserWhereInput = { ...where, firmId };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where: fullWhere,
        skip,
        take,
        orderBy,
        include: { employeeProfile: true },
      }),
      this.prisma.user.count({ where: fullWhere }),
    ]);

    return { data, total, skip, take };
  }

  async findStaffByFirm(firmId: string) {
    return this.prisma.user.findMany({
      where: { firmId, userType: 'STAFF' },
      include: { employeeProfile: true },
    });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data, include: { employeeProfile: true } });
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({
      where: { id },
      data,
      include: { employeeProfile: true },
    });
  }

  async delete(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { status: 'inactive' },
    });
  }
}
