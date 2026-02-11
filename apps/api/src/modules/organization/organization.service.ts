import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { Prisma, OrgUserRole, UserType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { OrganizationRepository } from './organization.repository';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationService {
  constructor(
    private readonly orgRepository: OrganizationRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string) {
    const org = await this.orgRepository.findById(id);
    if (!org) throw new NotFoundException({ code: 'ORG_NOT_FOUND', message: 'Organization not found' });
    return org;
  }

  async findMany(firmId: string, query: { page?: number; limit?: number; search?: string }) {
    const { page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrganizationWhereInput = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cin: { contains: search, mode: 'insensitive' } },
      ];
    }

    const result = await this.orgRepository.findMany({ firmId, skip, take: limit, where });
    return {
      data: result.data,
      meta: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) },
    };
  }

  async create(firmId: string, dto: CreateOrganizationDto) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          cin: dto.cin,
          registeredAddress: dto.registeredAddress,
          metadata: (dto.metadata as Prisma.InputJsonValue) || Prisma.JsonNull,
          firm: { connect: { id: firmId } },
        },
      });

      // Create primary contact as CLIENT user if provided
      if (dto.primaryContact) {
        const existingUser = await tx.user.findFirst({ where: { email: dto.primaryContact.email } });

        let userId: string;
        if (existingUser) {
          userId = existingUser.id;
        } else {
          const passwordHash = await bcrypt.hash(dto.primaryContact.password || 'TempPass123!', 12);
          const user = await tx.user.create({
            data: {
              email: dto.primaryContact.email,
              passwordHash,
              firstName: dto.primaryContact.firstName,
              lastName: dto.primaryContact.lastName,
              phone: dto.primaryContact.phone,
              userType: UserType.CLIENT,
              firm: { connect: { id: firmId } },
            },
          });
          userId = user.id;
        }

        await tx.orgUser.create({
          data: {
            orgId: org.id,
            userId,
            firmId,
            role: OrgUserRole.OWNER,
          },
        });
      }

      return tx.organization.findUnique({
        where: { id: org.id },
        include: {
          orgUsers: {
            include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
          },
        },
      });
    });
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    await this.findById(id);
    return this.orgRepository.update(id, {
      ...(dto.name && { name: dto.name }),
      ...(dto.cin && { cin: dto.cin }),
      ...(dto.registeredAddress !== undefined && { registeredAddress: dto.registeredAddress }),
      ...(dto.metadata !== undefined && { metadata: dto.metadata as Prisma.InputJsonValue }),
    });
  }

  async getMembers(orgId: string) {
    await this.findById(orgId);
    return this.prisma.orgUser.findMany({
      where: { orgId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, userType: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async addMember(orgId: string, userId: string, role: OrgUserRole) {
    await this.findById(orgId);

    const existing = await this.prisma.orgUser.findUnique({
      where: { userId_orgId: { userId, orgId } },
    });
    if (existing) throw new ConflictException({ code: 'MEMBER_EXISTS', message: 'User is already a member' });

    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new BadRequestException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    const org = await this.prisma.organization.findFirst({ where: { id: orgId } });
    return this.prisma.orgUser.create({
      data: { orgId, userId, firmId: org!.firmId, role },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
  }

  async removeMember(orgId: string, userId: string) {
    await this.findById(orgId);
    return this.prisma.orgUser.delete({
      where: { userId_orgId: { userId, orgId } },
    });
  }
}
