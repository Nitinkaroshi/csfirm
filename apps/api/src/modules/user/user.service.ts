import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Prisma, UserType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../database/prisma.service';
import { UserRepository } from './user.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) {}

  async findById(id: string) {
    const user = await this.userRepository.findById(id);
    if (!user) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });
    return this.sanitizeUser(user);
  }

  async findMany(firmId: string, query: { page?: number; limit?: number; type?: UserType; search?: string }) {
    const { page = 1, limit = 20, type, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.UserWhereInput = {};
    if (type) where.userType = type;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const result = await this.userRepository.findMany({ firmId, skip, take: limit, where });
    return {
      data: result.data.map((u) => this.sanitizeUser(u)),
      meta: {
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      },
    };
  }

  async createStaffUser(firmId: string, dto: CreateUserDto) {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) throw new ConflictException({ code: 'EMAIL_EXISTS', message: 'Email already in use' });

    const passwordHash = await bcrypt.hash(dto.password, 12);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          phone: dto.phone,
          userType: UserType.STAFF,
          firm: { connect: { id: firmId } },
        },
      });

      if (dto.staffRole) {
        await tx.employeeProfile.create({
          data: {
            userId: created.id,
            firmId,
            role: dto.staffRole,
            specializations: dto.specializations || [],
            maxCases: dto.maxCaseLoad || 20,
          },
        });
      }

      return tx.user.findUnique({
        where: { id: created.id },
        include: { employeeProfile: true },
      });
    });

    return this.sanitizeUser(user!);
  }

  async update(id: string, dto: UpdateUserDto) {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) throw new NotFoundException({ code: 'USER_NOT_FOUND', message: 'User not found' });

    const data: Prisma.UserUpdateInput = {};
    if (dto.firstName) data.firstName = dto.firstName;
    if (dto.lastName) data.lastName = dto.lastName;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.isActive !== undefined) data.status = dto.isActive ? 'active' : 'inactive';

    const updated = await this.userRepository.update(id, data);

    if (dto.staffRole || dto.specializations || dto.maxCaseLoad !== undefined) {
      await this.prisma.employeeProfile.upsert({
        where: { userId: id },
        update: {
          ...(dto.staffRole && { role: dto.staffRole }),
          ...(dto.specializations && { specializations: dto.specializations }),
          ...(dto.maxCaseLoad !== undefined && { maxCases: dto.maxCaseLoad }),
        },
        create: {
          userId: id,
          firmId: (existingUser as any).firmId,
          role: dto.staffRole!,
          specializations: dto.specializations || [],
          maxCases: dto.maxCaseLoad || 20,
        },
      });
    }

    return this.sanitizeUser(updated);
  }

  async deactivate(id: string) {
    await this.findById(id);
    const user = await this.userRepository.delete(id);
    return this.sanitizeUser(user);
  }

  private sanitizeUser(user: Record<string, unknown>) {
    const { passwordHash, ...rest } = user as Record<string, unknown> & { passwordHash?: string };
    return rest;
  }
}
