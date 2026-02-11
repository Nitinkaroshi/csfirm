import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CaseStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CaseStateMachine, AllowedRole, SideEffect } from './state-machine/case-state-machine';
import { DomainEvents } from '../../common/constants/events.constants';

export interface TransitionContext {
  caseId: string;
  targetStatus: CaseStatus;
  actorRole: AllowedRole;
  actorId: string;
  firmId: string;
  reason?: string;
}

@Injectable()
export class TransitionExecutor {
  private readonly logger = new Logger(TransitionExecutor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stateMachine: CaseStateMachine,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(ctx: TransitionContext) {
    // Run the transition inside a transaction with row-level locking
    const result = await this.prisma.$transaction(async (tx) => {
      // SELECT ... FOR UPDATE to prevent concurrent transitions
      const cases = await tx.$queryRaw<Array<{ id: string; status: CaseStatus }>>`
        SELECT id, status FROM "Case" WHERE id = ${ctx.caseId} FOR UPDATE
      `;

      if (!cases[0]) {
        throw new Error(`Case ${ctx.caseId} not found`);
      }

      const currentStatus = cases[0].status as CaseStatus;
      const transition = this.stateMachine.findTransition(currentStatus, ctx.targetStatus, ctx.actorRole);

      if (transition.requiresReason && !ctx.reason) {
        throw new Error(`Reason is required for transition ${currentStatus} → ${ctx.targetStatus}`);
      }

      // Build the update payload
      const updateData: Record<string, unknown> = {
        status: ctx.targetStatus,
      };

      // Handle SET_COMPLETED_AT side effect inside transaction
      if (transition.sideEffects.includes('SET_COMPLETED_AT')) {
        updateData.completedAt = new Date();
      }

      const updated = await tx.case.update({
        where: { id: ctx.caseId },
        data: updateData,
        include: {
          service: { select: { id: true, name: true, category: true } },
          organization: { select: { id: true, name: true } },
          assignedTo: {
            select: {
              id: true,
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
        },
      });

      return { case: updated, transition, fromStatus: currentStatus };
    });

    // Fire side effects OUTSIDE the transaction (non-blocking)
    this.fireSideEffects(result.transition.sideEffects, {
      case: result.case,
      fromStatus: result.fromStatus,
      toStatus: ctx.targetStatus,
      actorId: ctx.actorId,
      firmId: ctx.firmId,
      reason: ctx.reason,
    });

    return result.case;
  }

  private fireSideEffects(
    sideEffects: SideEffect[],
    payload: {
      case: Record<string, unknown>;
      fromStatus: CaseStatus;
      toStatus: CaseStatus;
      actorId: string;
      firmId: string;
      reason?: string;
    },
  ) {
    for (const effect of sideEffects) {
      try {
        switch (effect) {
          case 'EMIT_STATUS_CHANGED':
            this.eventEmitter.emit(DomainEvents.CASE_STATUS_CHANGED, payload);
            break;
          case 'EMIT_SUBMITTED':
            this.eventEmitter.emit(DomainEvents.CASE_SUBMITTED, payload);
            break;
          case 'EMIT_COMPLETED':
            this.eventEmitter.emit(DomainEvents.CASE_COMPLETED, payload);
            break;
          case 'EMIT_REJECTED':
            this.eventEmitter.emit(DomainEvents.CASE_REJECTED, payload);
            break;
          case 'EMIT_DOCS_REQUESTED':
            this.eventEmitter.emit(DomainEvents.CASE_DOCS_REQUESTED, payload);
            break;
          case 'AUTO_ASSIGN':
            this.eventEmitter.emit(DomainEvents.CASE_SUBMITTED, { ...payload, needsAssignment: true });
            break;
          case 'SET_SLA_DEADLINE':
            this.eventEmitter.emit('case.sla.set', payload);
            break;
          case 'CREATE_CHAT_ROOMS':
            this.eventEmitter.emit('case.chat.create', payload);
            break;
          case 'NOTIFY_CLIENT':
            this.eventEmitter.emit('notification.client', payload);
            break;
          case 'SET_COMPLETED_AT':
            // Handled inside transaction
            break;
        }
      } catch (err) {
        this.logger.error(`Side effect ${effect} failed for case ${payload.case.id}`, (err as Error).stack);
      }
    }
  }
}
