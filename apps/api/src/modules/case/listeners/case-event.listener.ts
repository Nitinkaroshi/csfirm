import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainEvents } from '../../../common/constants/events.constants';
import { AssignmentService } from '../assignment.service';

@Injectable()
export class CaseEventListener {
  private readonly logger = new Logger(CaseEventListener.name);

  constructor(private readonly assignmentService: AssignmentService) {}

  @OnEvent(DomainEvents.CASE_SUBMITTED)
  async handleCaseSubmitted(payload: { case: { id: string }; firmId: string; needsAssignment?: boolean }) {
    if (!payload.needsAssignment) return;

    this.logger.log(`Auto-assigning case ${payload.case.id}`);
    try {
      const assignedTo = await this.assignmentService.autoAssign(payload.case.id, payload.firmId);
      if (assignedTo) {
        this.logger.log(`Case ${payload.case.id} auto-assigned to employee ${assignedTo}`);
      } else {
        this.logger.warn(`No candidates found for auto-assignment of case ${payload.case.id}`);
      }
    } catch (err) {
      this.logger.error(`Auto-assignment failed for case ${payload.case.id}`, (err as Error).stack);
    }
  }

  @OnEvent(DomainEvents.CASE_STATUS_CHANGED)
  handleStatusChanged(payload: { case: { id: string; caseNumber: string }; fromStatus: string; toStatus: string }) {
    this.logger.log(`Case ${payload.case.caseNumber}: ${payload.fromStatus} → ${payload.toStatus}`);
  }

  @OnEvent(DomainEvents.CASE_COMPLETED)
  handleCaseCompleted(payload: { case: { id: string; caseNumber: string } }) {
    this.logger.log(`Case ${payload.case.caseNumber} completed`);
  }

  @OnEvent(DomainEvents.CASE_REJECTED)
  handleCaseRejected(payload: { case: { id: string; caseNumber: string }; reason?: string }) {
    this.logger.log(`Case ${payload.case.caseNumber} rejected. Reason: ${payload.reason || 'N/A'}`);
  }
}
