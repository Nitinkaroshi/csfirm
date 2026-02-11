import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { NotificationChannel } from '@prisma/client';
import { NotificationRuleEngine } from '../notification-rule-engine';
import { NotificationService } from '../notification.service';
import { QUEUE_NAMES } from '../../../common/constants/queues.constants';

@Injectable()
export class NotificationEventListener {
  private readonly logger = new Logger(NotificationEventListener.name);

  constructor(
    private readonly ruleEngine: NotificationRuleEngine,
    private readonly notificationService: NotificationService,
    @InjectQueue(QUEUE_NAMES.EMAIL) private readonly emailQueue: Queue,
  ) {}

  @OnEvent('case.*')
  async handleCaseEvent(payload: Record<string, unknown>) {
    const eventName = payload._eventName as string;
    if (!eventName) return;

    const rules = this.ruleEngine.getRulesForEvent(eventName);
    if (rules.length === 0) return;

    for (const rule of rules) {
      try {
        const caseData = payload.case as Record<string, unknown>;
        const vars: Record<string, string> = {
          caseNumber: (caseData?.caseNumber as string) || '',
          fromStatus: (payload.fromStatus as string) || '',
          toStatus: (payload.toStatus as string) || '',
          reason: (payload.reason as string) || '',
        };

        const title = this.ruleEngine.interpolate(rule.titleTemplate, vars);
        const body = this.ruleEngine.interpolate(rule.bodyTemplate, vars);

        // Determine recipient user IDs based on rule
        const recipientIds = await this.resolveRecipients(rule.recipients, payload);

        for (const userId of recipientIds) {
          for (const channel of rule.channels) {
            if (channel === NotificationChannel.IN_APP) {
              await this.notificationService.create({
                userId,
                firmId: payload.firmId as string,
                title,
                body,
                channel: NotificationChannel.IN_APP,
                metadata: { eventName, caseId: (caseData?.id as string) },
              });
            } else if (channel === NotificationChannel.EMAIL) {
              await this.emailQueue.add('send-email', {
                userId,
                firmId: payload.firmId,
                title,
                body,
                eventName,
              });
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to process notification rule for ${eventName}`, (err as Error).stack);
      }
    }
  }

  private async resolveRecipients(type: string, payload: Record<string, unknown>): Promise<string[]> {
    const caseData = payload.case as Record<string, unknown>;
    switch (type) {
      case 'assignee': {
        const assignedTo = caseData?.assignedTo as { user?: { id: string } };
        return assignedTo?.user?.id ? [assignedTo.user.id] : [];
      }
      case 'client': {
        const createdBy = caseData?.createdByUser as { id: string };
        return createdBy?.id ? [createdBy.id] : [];
      }
      case 'actor':
        return payload.actorId ? [payload.actorId as string] : [];
      default:
        return [];
    }
  }
}
