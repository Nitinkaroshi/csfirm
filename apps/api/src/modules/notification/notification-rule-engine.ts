import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';

interface NotificationRule {
  event: string;
  recipients: 'assignee' | 'client' | 'managers' | 'actor';
  channels: NotificationChannel[];
  titleTemplate: string;
  bodyTemplate: string;
}

const RULES: NotificationRule[] = [
  {
    event: 'case.submitted',
    recipients: 'managers',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'New Case Submitted',
    bodyTemplate: 'Case {{caseNumber}} has been submitted and needs review.',
  },
  {
    event: 'case.status.changed',
    recipients: 'assignee',
    channels: [NotificationChannel.IN_APP],
    titleTemplate: 'Case Status Updated',
    bodyTemplate: 'Case {{caseNumber}} status changed from {{fromStatus}} to {{toStatus}}.',
  },
  {
    event: 'case.assigned',
    recipients: 'assignee',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'Case Assigned to You',
    bodyTemplate: 'Case {{caseNumber}} has been assigned to you.',
  },
  {
    event: 'case.transferred',
    recipients: 'assignee',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'Case Transferred to You',
    bodyTemplate: 'Case {{caseNumber}} has been transferred to you. Reason: {{reason}}',
  },
  {
    event: 'case.docs.requested',
    recipients: 'client',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'Documents Requested',
    bodyTemplate: 'Additional documents are required for case {{caseNumber}}.',
  },
  {
    event: 'case.completed',
    recipients: 'client',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'Case Completed',
    bodyTemplate: 'Case {{caseNumber}} has been completed.',
  },
  {
    event: 'case.rejected',
    recipients: 'client',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'Case Rejected',
    bodyTemplate: 'Case {{caseNumber}} has been rejected. Reason: {{reason}}',
  },
  {
    event: 'invoice.issued',
    recipients: 'client',
    channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
    titleTemplate: 'New Invoice',
    bodyTemplate: 'Invoice {{invoiceNumber}} for {{amount}} has been issued.',
  },
  {
    event: 'chat.message.sent',
    recipients: 'assignee',
    channels: [NotificationChannel.IN_APP],
    titleTemplate: 'New Message',
    bodyTemplate: '{{senderName}} sent a message in case {{caseNumber}}.',
  },
];

@Injectable()
export class NotificationRuleEngine {
  getRulesForEvent(eventName: string): NotificationRule[] {
    return RULES.filter((r) => r.event === eventName);
  }

  interpolate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] || `{{${key}}}`);
  }
}
