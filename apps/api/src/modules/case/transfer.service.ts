import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '../../common/constants/events.constants';

@Injectable()
export class TransferService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async transferCase(params: {
    caseId: string;
    fromEmployeeId: string;
    toEmployeeId: string;
    reason: string;
    transferredById: string;
    firmId: string;
  }) {
    const { caseId, fromEmployeeId, toEmployeeId, reason, transferredById, firmId } = params;

    if (fromEmployeeId === toEmployeeId) {
      throw new BadRequestException({ code: 'SAME_ASSIGNEE', message: 'Cannot transfer to the same employee' });
    }

    // Verify target employee exists and belongs to same firm
    const targetEmployee = await this.prisma.employeeProfile.findFirst({
      where: { id: toEmployeeId, user: { firmId } },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });

    if (!targetEmployee) {
      throw new NotFoundException({ code: 'EMPLOYEE_NOT_FOUND', message: 'Target employee not found' });
    }

    // Check capacity
    if (targetEmployee.activeCases >= targetEmployee.maxCases) {
      throw new BadRequestException({
        code: 'EMPLOYEE_AT_CAPACITY',
        message: `${targetEmployee.user.firstName} ${targetEmployee.user.lastName} is at maximum case capacity`,
      });
    }

    // Execute transfer in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update case assignment
      const updated = await tx.case.update({
        where: { id: caseId },
        data: { assignedToId: toEmployeeId },
        include: {
          service: { select: { id: true, name: true } },
          organization: { select: { id: true, name: true } },
        },
      });

      // Create transfer log
      await tx.caseTransferLog.create({
        data: {
          caseId,
          firmId,
          fromEmployeeId,
          toEmployeeId,
          reason,
          transferredBy: transferredById,
        },
      });

      return updated;
    });

    // Emit transfer event
    this.eventEmitter.emit(DomainEvents.CASE_TRANSFERRED, {
      case: result,
      fromEmployeeId,
      toEmployeeId,
      reason,
      firmId,
    });

    return result;
  }

  async getTransferHistory(caseId: string) {
    return this.prisma.caseTransferLog.findMany({
      where: { caseId },
      orderBy: { createdAt: 'desc' },
      include: {
        fromEmployee: {
          select: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        toEmployee: {
          select: { user: { select: { id: true, firstName: true, lastName: true } } },
        },
        initiator: {
          select: { firstName: true, lastName: true },
        },
      },
    });
  }
}
