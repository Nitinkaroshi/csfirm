import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaseStatus, StaffRole, InternalFlag } from '@prisma/client';
import { DomainEvents } from '../../common/constants/events.constants';

@Injectable()
export class BulkOperationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async bulkAssignCases(caseIds: string[], employeeProfileId: string, firmId: string) {
    const employee = await this.prisma.employeeProfile.findUnique({
      where: { id: employeeProfileId },
      include: { assignedCases: true },
    });

    if (!employee) {
      throw new BadRequestException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Employee not found' });
    }

    const currentLoad = employee.assignedCases.length;
    if (currentLoad + caseIds.length > employee.maxCases) {
      throw new BadRequestException({
        code: 'WORKLOAD_EXCEEDED',
        message: `Employee workload would exceed maximum (${employee.maxCases} cases)`,
      });
    }

    const updated = await this.prisma.$transaction(
      caseIds.map(caseId =>
        this.prisma.case.update({
          where: { id: caseId },
          data: { assignedToId: employeeProfileId },
        })
      )
    );

    // Emit events for each case
    updated.forEach(caseData => {
      this.eventEmitter.emit(DomainEvents.CASE_ASSIGNED, {
        case: caseData,
        firmId,
        assigneeId: employee.userId,
      });
    });

    return { success: true, updatedCount: updated.length };
  }

  async bulkUpdateStatus(
    caseIds: string[],
    status: CaseStatus,
    userId: string,
    userRole: StaffRole,
    firmId: string,
  ) {
    // Validate status transition permissions
    const isRestrictedStatus = status === CaseStatus.REJECTED || status === CaseStatus.COMPLETED;
    const isAdmin = userRole === StaffRole.ADMIN || userRole === StaffRole.MASTER_ADMIN;
    if (isRestrictedStatus && !isAdmin) {
      throw new BadRequestException({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: 'Only admins can bulk update to COMPLETED or REJECTED status',
      });
    }

    const updated = await this.prisma.$transaction(
      caseIds.map(caseId =>
        this.prisma.case.update({
          where: { id: caseId },
          data: { status, updatedAt: new Date() },
        })
      )
    );

    // Emit events
    updated.forEach(caseData => {
      this.eventEmitter.emit(DomainEvents.CASE_STATUS_CHANGED, {
        case: caseData,
        toStatus: status,
        firmId,
        actorId: userId,
      });
    });

    return { success: true, updatedCount: updated.length };
  }

  async bulkAddFlag(caseIds: string[], flag: string) {
    const flagEnum = flag.toUpperCase() as InternalFlag;
    const cases = await this.prisma.case.findMany({
      where: { id: { in: caseIds } },
      select: { id: true, internalFlags: true },
    });

    const updated = await this.prisma.$transaction(
      cases.map(c => {
        const flags = c.internalFlags as InternalFlag[];
        const newFlags = flags.includes(flagEnum) ? flags : [...flags, flagEnum];
        return this.prisma.case.update({
          where: { id: c.id },
          data: { internalFlags: newFlags },
        });
      })
    );

    return { success: true, updatedCount: updated.length };
  }

  async bulkRemoveFlag(caseIds: string[], flag: string) {
    const flagEnum = flag.toUpperCase() as InternalFlag;
    const cases = await this.prisma.case.findMany({
      where: { id: { in: caseIds } },
      select: { id: true, internalFlags: true },
    });

    const updated = await this.prisma.$transaction(
      cases.map(c =>
        this.prisma.case.update({
          where: { id: c.id },
          data: {
            internalFlags: c.internalFlags.filter(f => f !== flagEnum),
          },
        })
      )
    );

    return { success: true, updatedCount: updated.length };
  }
}
