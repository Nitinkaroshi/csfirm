import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, CaseStatus, CasePriority, InternalFlag } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaseRepository } from './case.repository';
import { TransitionExecutor, TransitionContext } from './transition-executor';
import { AssignmentService } from './assignment.service';
import { TransferService } from './transfer.service';
import { CaseStateMachine, AllowedRole } from './state-machine/case-state-machine';
import { DomainEvents } from '../../common/constants/events.constants';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { TransferCaseDto } from './dto/transfer-case.dto';

@Injectable()
export class CaseService {
  constructor(
    private readonly caseRepository: CaseRepository,
    private readonly stateMachine: CaseStateMachine,
    private readonly transitionExecutor: TransitionExecutor,
    private readonly assignmentService: AssignmentService,
    private readonly transferService: TransferService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string) {
    const caseData = await this.caseRepository.findById(id);
    if (!caseData) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found' });
    return caseData;
  }

  async findMany(firmId: string, query: {
    page?: number;
    limit?: number;
    status?: CaseStatus;
    priority?: CasePriority;
    assignedToId?: string;
    organizationId?: string;
    serviceId?: string;
    search?: string;
  }) {
    const { page = 1, limit = 20, status, priority, assignedToId, organizationId, serviceId, search } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CaseWhereInput = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (organizationId) where.orgId = organizationId;
    if (serviceId) where.serviceId = serviceId;
    if (search) {
      where.OR = [{ caseNumber: { contains: search, mode: 'insensitive' } }];
    }

    const result = await this.caseRepository.findMany({ firmId, skip, take: limit, where });
    return {
      data: result.data,
      meta: { total: result.total, page, limit, totalPages: Math.ceil(result.total / limit) },
    };
  }

  async create(firmId: string, userId: string, dto: CreateCaseDto) {
    const caseNumber = await this.caseRepository.generateCaseNumber(firmId);

    const caseData = await this.caseRepository.create({
      caseNumber,
      priority: dto.priority || CasePriority.NORMAL,
      status: CaseStatus.DRAFT,
      formData: (dto.formData as Prisma.InputJsonValue) || Prisma.JsonNull,
      internalFlags: [],
      firm: { connect: { id: firmId } },
      service: { connect: { id: dto.serviceId } },
      organization: { connect: { id: dto.organizationId } },
      createdBy: { connect: { id: userId } },
    });

    this.eventEmitter.emit(DomainEvents.CASE_CREATED, { case: caseData, firmId, actorId: userId });
    return caseData;
  }

  async updateStatus(caseId: string, actorId: string, actorRole: AllowedRole, firmId: string, dto: UpdateStatusDto) {
    const ctx: TransitionContext = {
      caseId,
      targetStatus: dto.status,
      actorRole,
      actorId,
      firmId,
      reason: dto.reason,
    };
    return this.transitionExecutor.execute(ctx);
  }

  async getAvailableTransitions(caseId: string, actorRole: AllowedRole) {
    const caseData = await this.findById(caseId);
    return this.stateMachine.getAvailableTransitions(caseData.status, actorRole);
  }

  async assignCase(caseId: string, employeeProfileId: string) {
    await this.findById(caseId);
    await this.assignmentService.manualAssign(caseId, employeeProfileId);
    return this.caseRepository.findById(caseId);
  }

  async autoAssignCase(caseId: string, firmId: string) {
    return this.assignmentService.autoAssign(caseId, firmId);
  }

  async transferCase(caseId: string, transferredById: string, firmId: string, dto: TransferCaseDto) {
    const caseData = await this.findById(caseId);
    if (!caseData.assignedToId) {
      throw new BadRequestException({ code: 'CASE_NOT_ASSIGNED', message: 'Case is not assigned to anyone' });
    }
    return this.transferService.transferCase({
      caseId,
      fromEmployeeId: caseData.assignedToId,
      toEmployeeId: dto.toEmployeeId,
      reason: dto.reason,
      transferredById,
      firmId,
    });
  }

  async getTransferHistory(caseId: string) {
    await this.findById(caseId);
    return this.transferService.getTransferHistory(caseId);
  }

  async addFlag(caseId: string, flag: string) {
    const caseData = await this.findById(caseId);
    const flags = [...(caseData.internalFlags || [])];
    if (!flags.includes(flag as InternalFlag)) {
      flags.push(flag as InternalFlag);
    }
    const updated = await this.caseRepository.update(caseId, { internalFlags: flags });
    this.eventEmitter.emit(DomainEvents.CASE_FLAG_ADDED, { case: updated, flag });
    return updated;
  }

  async removeFlag(caseId: string, flag: string) {
    const caseData = await this.findById(caseId);
    const flags = (caseData.internalFlags || []).filter((f: string) => f !== flag);
    return this.caseRepository.update(caseId, { internalFlags: flags });
  }
}
