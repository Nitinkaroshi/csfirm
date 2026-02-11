import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateDeadlineDto } from './dto/create-deadline.dto';
import { UpdateDeadlineDto } from './dto/update-deadline.dto';
import { DeadlineStatus } from '@prisma/client';

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new compliance deadline
   */
  async create(firmId: string, dto: CreateDeadlineDto) {
    return this.prisma.complianceDeadline.create({
      data: {
        firmId,
        caseId: dto.caseId,
        orgId: dto.orgId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        reminderDays: dto.reminderDays || [7, 3, 1],
        mcaFormType: dto.mcaFormType,
        mcaReference: dto.mcaReference,
      },
      include: {
        case_: {
          select: {
            caseNumber: true,
            organization: { select: { name: true } },
          },
        },
        organization: { select: { name: true } },
      },
    });
  }

  /**
   * Get all deadlines for a firm with optional filters
   */
  async findAll(firmId: string, filters?: {
    status?: DeadlineStatus;
    caseId?: string;
    orgId?: string;
    upcoming?: boolean; // next 30 days
  }) {
    const where: any = { firmId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.caseId) {
      where.caseId = filters.caseId;
    }

    if (filters?.orgId) {
      where.orgId = filters.orgId;
    }

    if (filters?.upcoming) {
      const now = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(now.getDate() + 30);

      where.dueDate = {
        gte: now,
        lte: thirtyDaysFromNow,
      };
      where.status = { in: [DeadlineStatus.UPCOMING, DeadlineStatus.DUE_SOON] };
    }

    return this.prisma.complianceDeadline.findMany({
      where,
      include: {
        case_: {
          select: {
            id: true,
            caseNumber: true,
            organization: { select: { name: true } },
          },
        },
        organization: { select: { id: true, name: true } },
        completedByUser: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  /**
   * Get deadline by ID
   */
  async findOne(id: string, firmId: string) {
    const deadline = await this.prisma.complianceDeadline.findFirst({
      where: { id, firmId },
      include: {
        case_: {
          select: {
            caseNumber: true,
            organization: { select: { name: true } },
          },
        },
        organization: { select: { name: true } },
        completedByUser: {
          select: {
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    if (!deadline) {
      throw new NotFoundException('Compliance deadline not found');
    }

    return deadline;
  }

  /**
   * Update deadline
   */
  async update(id: string, firmId: string, dto: UpdateDeadlineDto) {
    const deadline = await this.findOne(id, firmId);

    return this.prisma.complianceDeadline.update({
      where: { id: deadline.id },
      data: {
        caseId: dto.caseId,
        orgId: dto.orgId,
        type: dto.type,
        title: dto.title,
        description: dto.description,
        dueDate: dto.dueDate,
        reminderDays: dto.reminderDays,
        mcaFormType: dto.mcaFormType,
        mcaReference: dto.mcaReference,
      },
    });
  }

  /**
   * Mark deadline as completed
   */
  async markCompleted(id: string, firmId: string, completedBy: string) {
    const deadline = await this.findOne(id, firmId);

    return this.prisma.complianceDeadline.update({
      where: { id: deadline.id },
      data: {
        status: DeadlineStatus.COMPLETED,
        completedAt: new Date(),
        completedBy,
      },
    });
  }

  /**
   * Delete deadline
   */
  async delete(id: string, firmId: string) {
    const deadline = await this.findOne(id, firmId);

    await this.prisma.complianceDeadline.delete({
      where: { id: deadline.id },
    });

    return { message: 'Deadline deleted successfully' };
  }

  /**
   * Update deadline statuses based on due dates (run daily via cron)
   */
  async updateStatuses() {
    const now = new Date();
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(now.getDate() + 7);

    // Mark overdue
    await this.prisma.complianceDeadline.updateMany({
      where: {
        dueDate: { lt: now },
        status: { in: [DeadlineStatus.UPCOMING, DeadlineStatus.DUE_SOON] },
      },
      data: { status: DeadlineStatus.OVERDUE },
    });

    // Mark due soon (within 7 days)
    await this.prisma.complianceDeadline.updateMany({
      where: {
        dueDate: { gte: now, lte: sevenDaysFromNow },
        status: DeadlineStatus.UPCOMING,
      },
      data: { status: DeadlineStatus.DUE_SOON },
    });

    return { message: 'Deadline statuses updated' };
  }

  /**
   * Get deadlines requiring reminders
   */
  async getDeadlinesForReminders() {
    const now = new Date();

    const deadlines = await this.prisma.complianceDeadline.findMany({
      where: {
        status: { in: [DeadlineStatus.UPCOMING, DeadlineStatus.DUE_SOON] },
      },
      include: {
        firm: { select: { name: true } },
        case_: {
          select: {
            caseNumber: true,
            organization: { select: { name: true } },
            assignedTo: {
              select: {
                user: { select: { email: true, firstName: true } },
              },
            },
          },
        },
        organization: { select: { name: true } },
      },
    });

    // Filter deadlines that need reminders based on reminderDays
    return deadlines.filter((deadline) => {
      const daysUntilDue = Math.ceil(
        (deadline.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Check if today matches any reminder day
      return deadline.reminderDays.includes(daysUntilDue);
    });
  }
}
