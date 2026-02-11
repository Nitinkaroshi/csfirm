# 05 — Event-Driven Notification Architecture

## Overview

The notification system follows a three-stage pipeline:

```
Domain Event → Notification Rule Engine → Channel Router → Async Delivery
```

No module directly sends notifications. Modules emit domain events. The notification system reacts.

---

## Stage 1: Domain Events

### Event Taxonomy

All events are defined as typed constants:

```typescript
// common/constants/events.constants.ts

export const DomainEvents = {
  // Case events
  CASE_CREATED: 'case.created',
  CASE_SUBMITTED: 'case.submitted',
  CASE_STATUS_CHANGED: 'case.status.changed',
  CASE_ASSIGNED: 'case.assigned',
  CASE_TRANSFERRED: 'case.transferred',
  CASE_ESCALATED: 'case.escalated',
  CASE_DOCS_REQUESTED: 'case.docs.requested',
  CASE_COMPLETED: 'case.completed',
  CASE_REJECTED: 'case.rejected',
  CASE_SLA_WARNING: 'case.sla.warning',
  CASE_SLA_BREACHED: 'case.sla.breached',
  CASE_FLAG_ADDED: 'case.flag.added',

  // Chat events
  CHAT_MESSAGE_SENT: 'chat.message.sent',

  // Document events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_VERIFIED: 'document.verified',
  VAULT_ACCESSED: 'vault.accessed',

  // Invoice events
  INVOICE_CREATED: 'invoice.created',
  INVOICE_ISSUED: 'invoice.issued',
  INVOICE_PAID: 'invoice.paid',
  INVOICE_OVERDUE: 'invoice.overdue',

  // User events
  USER_REGISTERED: 'user.registered',
  USER_LOGIN: 'user.login',
} as const;

export type DomainEvent = typeof DomainEvents[keyof typeof DomainEvents];
```

### Event Payload Interface

```typescript
// common/interfaces/domain-event.interface.ts

export interface DomainEventPayload<T = any> {
  eventType: DomainEvent;
  firmId: string;
  actorId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  data: T;
  metadata: {
    requestId: string;
    timestamp: Date;
    ipAddress?: string;
  };
}
```

### How Events Are Emitted

```typescript
// modules/case/case.service.ts

@Injectable()
export class CaseService {
  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly prisma: PrismaService,
  ) {}

  async submitCase(caseId: string, actor: AuthenticatedUser): Promise<Case> {
    const case_ = await this.prisma.case.update({
      where: { id: caseId },
      data: {
        status: CaseStatus.SUBMITTED,
        submittedAt: new Date(),
      },
    });

    // Emit domain event — CaseService has ZERO knowledge of notifications
    this.eventEmitter.emit(DomainEvents.CASE_SUBMITTED, {
      eventType: DomainEvents.CASE_SUBMITTED,
      firmId: actor.firmId,
      actorId: actor.id,
      actorRole: actor.role,
      entityType: 'case',
      entityId: case_.id,
      data: {
        caseNumber: case_.caseNumber,
        orgId: case_.orgId,
        serviceId: case_.serviceId,
        assignedToId: case_.assignedToId,
      },
    } satisfies DomainEventPayload);

    return case_;
  }
}
```

---

## Stage 2: Notification Rule Engine

### Event Listener → Rule Evaluation → Job Creation

```typescript
// modules/notification/listeners/case-event.listener.ts

@Injectable()
export class CaseEventListener {
  constructor(
    private readonly ruleEngine: NotificationRuleEngine,
    @InjectQueue('notifications') private readonly notifQueue: Queue,
  ) {}

  @OnEvent(DomainEvents.CASE_SUBMITTED)
  async handleCaseSubmitted(payload: DomainEventPayload) {
    const notifications = await this.ruleEngine.evaluate(payload);

    // Each notification becomes a BullMQ job
    for (const notif of notifications) {
      await this.notifQueue.add(notif.channel, notif, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      });
    }
  }

  @OnEvent(DomainEvents.CASE_TRANSFERRED)
  async handleCaseTransferred(payload: DomainEventPayload) {
    const notifications = await this.ruleEngine.evaluate(payload);
    for (const notif of notifications) {
      await this.notifQueue.add(notif.channel, notif, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
      });
    }
  }

  // ... more event handlers
}
```

### Rule Engine

The rule engine determines **who** gets notified and **via which channels**:

```typescript
// modules/notification/rules/notification-rule.engine.ts

@Injectable()
export class NotificationRuleEngine {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async evaluate(payload: DomainEventPayload): Promise<NotificationJob[]> {
    const rules = this.getRules(payload.eventType);
    const jobs: NotificationJob[] = [];

    for (const rule of rules) {
      const recipients = await rule.resolveRecipients(payload, this.prisma);
      const channels = rule.channels;

      for (const recipient of recipients) {
        for (const channel of channels) {
          jobs.push({
            eventType: payload.eventType,
            firmId: payload.firmId,
            recipientId: recipient.userId,
            recipientEmail: recipient.email,
            channel,
            title: rule.titleTemplate(payload),
            body: rule.bodyTemplate(payload),
            entityType: payload.entityType,
            entityId: payload.entityId,
            metadata: payload.data,
          });
        }
      }
    }

    return jobs;
  }

  private getRules(eventType: DomainEvent): NotificationRule[] {
    return NOTIFICATION_RULES[eventType] || [];
  }
}
```

### Rule Definitions

```typescript
// modules/notification/rules/rules.config.ts

export const NOTIFICATION_RULES: Record<DomainEvent, NotificationRule[]> = {

  [DomainEvents.CASE_SUBMITTED]: [
    {
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      resolveRecipients: async (payload, prisma) => {
        // Notify: assigned employee + all admins/managers
        const recipients = [];

        if (payload.data.assignedToId) {
          const assignee = await prisma.employeeProfile.findUnique({
            where: { id: payload.data.assignedToId },
            include: { user: true },
          });
          if (assignee) recipients.push(assignee.user);
        }

        const managers = await prisma.employeeProfile.findMany({
          where: {
            firmId: payload.firmId,
            role: { in: ['ADMIN', 'MANAGER'] },
          },
          include: { user: true },
        });
        recipients.push(...managers.map(m => m.user));

        return recipients;
      },
      titleTemplate: (p) => `New case submitted: ${p.data.caseNumber}`,
      bodyTemplate: (p) => `Case ${p.data.caseNumber} has been submitted and is awaiting review.`,
    },
  ],

  [DomainEvents.CASE_DOCS_REQUESTED]: [
    {
      channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      resolveRecipients: async (payload, prisma) => {
        // Notify: the client org owner who created the case
        const case_ = await prisma.case.findUnique({
          where: { id: payload.entityId },
          include: { createdBy: true },
        });
        return case_ ? [case_.createdBy] : [];
      },
      titleTemplate: (p) => `Documents requested for case ${p.data.caseNumber}`,
      bodyTemplate: (p) => `Additional documents are required for your case. Please upload them at your earliest convenience.`,
    },
  ],

  [DomainEvents.CASE_TRANSFERRED]: [
    {
      channels: [NotificationChannel.IN_APP],
      resolveRecipients: async (payload, prisma) => {
        // Notify: new assignee
        const newAssignee = await prisma.employeeProfile.findUnique({
          where: { id: payload.data.toEmployeeId },
          include: { user: true },
        });
        return newAssignee ? [newAssignee.user] : [];
      },
      titleTemplate: (p) => `Case ${p.data.caseNumber} transferred to you`,
      bodyTemplate: (p) => `You have been assigned case ${p.data.caseNumber}. Reason: ${p.data.reason}`,
    },
  ],

  // ... more rules for each event
};
```

---

## Stage 3: Async Delivery (BullMQ Workers)

### Queue Architecture

```
                    ┌──────────────────────┐
                    │  notifications queue  │
                    │                      │
                    │  Jobs named by       │
                    │  channel:            │
                    │  - IN_APP            │
                    │  - EMAIL             │
                    │  - PUSH (future)     │
                    │  - WHATSAPP (future) │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  IN_APP      │ │  EMAIL       │ │  PUSH        │
    │  Processor   │ │  Processor   │ │  Processor   │
    │              │ │              │ │  (Phase 2)   │
    │  - Save to   │ │  - Render    │ │              │
    │    DB        │ │    template  │ │              │
    │  - Emit via  │ │  - Send via  │ │              │
    │    Socket.io │ │    SES/SMTP  │ │              │
    └──────────────┘ └──────────────┘ └──────────────┘
```

### Worker Processors

```typescript
// apps/worker/src/processors/notification.processor.ts

@Processor('notifications')
export class NotificationProcessor {
  constructor(
    private readonly inAppChannel: InAppChannel,
    private readonly emailChannel: EmailChannel,
  ) {}

  @Process('IN_APP')
  async handleInApp(job: Job<NotificationJob>) {
    await this.inAppChannel.deliver(job.data);
  }

  @Process('EMAIL')
  async handleEmail(job: Job<NotificationJob>) {
    await this.emailChannel.deliver(job.data);
  }
}
```

### In-App Channel

```typescript
// modules/notification/channels/in-app.channel.ts

@Injectable()
export class InAppChannel implements NotificationChannelInterface {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketGateway: NotificationGateway,
  ) {}

  async deliver(job: NotificationJob): Promise<void> {
    // 1. Persist to database
    const notification = await this.prisma.notification.create({
      data: {
        firmId: job.firmId,
        userId: job.recipientId,
        eventType: job.eventType,
        title: job.title,
        body: job.body,
        entityType: job.entityType,
        entityId: job.entityId,
        channel: 'IN_APP',
        metadata: job.metadata,
      },
    });

    // 2. Push via Socket.io to user's room
    this.socketGateway.server
      .to(`user:${job.recipientId}`)
      .emit('notification', {
        id: notification.id,
        title: notification.title,
        body: notification.body,
        entityType: notification.entityType,
        entityId: notification.entityId,
        createdAt: notification.createdAt,
      });
  }
}
```

### Email Channel

```typescript
// modules/notification/channels/email.channel.ts

@Injectable()
export class EmailChannel implements NotificationChannelInterface {
  constructor(
    private readonly mailer: MailerService,   // nodemailer or SES SDK
    private readonly templateEngine: TemplateEngine,
  ) {}

  async deliver(job: NotificationJob): Promise<void> {
    const html = this.templateEngine.render(
      job.eventType,  // maps to template file
      {
        title: job.title,
        body: job.body,
        actionUrl: this.buildActionUrl(job),
        ...job.metadata,
      },
    );

    await this.mailer.send({
      to: job.recipientEmail,
      subject: job.title,
      html,
    });
  }

  private buildActionUrl(job: NotificationJob): string {
    if (job.entityType === 'case') {
      return `${process.env.FRONTEND_URL}/cases/${job.entityId}`;
    }
    return process.env.FRONTEND_URL;
  }
}
```

---

## Real-Time Notification Gateway

```typescript
// modules/notification/notification.gateway.ts

@WebSocketGateway({
  namespace: '/notifications',
  cors: { origin: process.env.FRONTEND_URL },
})
export class NotificationGateway implements OnGatewayConnection {
  @WebSocketServer()
  server: Server;

  async handleConnection(client: Socket) {
    const user = await this.authenticateSocket(client);
    if (!user) {
      client.disconnect();
      return;
    }

    // Join user-specific room for targeted notifications
    client.join(`user:${user.id}`);

    // Join firm room for broadcast notifications
    client.join(`firm:${user.firmId}`);
  }

  @SubscribeMessage('mark_read')
  async markRead(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { notificationId: string },
  ) {
    await this.notificationService.markRead(data.notificationId);
  }
}
```

---

## Notification Preferences (Phase 2)

```typescript
// Future: per-user notification preferences stored in DB
interface NotificationPreference {
  userId: string;
  eventType: DomainEvent;
  channels: {
    inApp: boolean;    // default: true
    email: boolean;    // default: true
    push: boolean;     // default: false
    whatsapp: boolean; // default: false
  };
}
```

For Phase 1, all users get IN_APP + EMAIL for all events. Preference granularity comes in Phase 2.

---

## BullMQ Queue Configuration

```typescript
// common/constants/queues.constants.ts

export const QUEUE_NAMES = {
  NOTIFICATIONS: 'notifications',
  SLA_CHECKER: 'sla-checker',
  CLEANUP: 'cleanup',
  REPORT_GENERATION: 'report-generation',
} as const;

// Queue-specific configs
export const QUEUE_CONFIGS = {
  [QUEUE_NAMES.NOTIFICATIONS]: {
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  },
  [QUEUE_NAMES.SLA_CHECKER]: {
    defaultJobOptions: {
      attempts: 1,
      removeOnComplete: true,
    },
  },
};
```

### SLA Checker (Recurring Job)

```typescript
// apps/worker/src/processors/sla-checker.processor.ts

@Processor('sla-checker')
export class SlaCheckerProcessor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  @Process('check')
  async checkSlaBreaches() {
    const now = new Date();

    // Find cases approaching SLA deadline (warning: 80% of deadline elapsed)
    const warningCases = await this.prisma.case.findMany({
      where: {
        slaBreached: false,
        slaDeadline: { lte: addHours(now, 24) },
        status: { notIn: ['COMPLETED', 'REJECTED', 'DRAFT'] },
      },
    });

    for (const case_ of warningCases) {
      this.eventEmitter.emit(DomainEvents.CASE_SLA_WARNING, {
        eventType: DomainEvents.CASE_SLA_WARNING,
        firmId: case_.firmId,
        entityType: 'case',
        entityId: case_.id,
        data: { caseNumber: case_.caseNumber, slaDeadline: case_.slaDeadline },
      });
    }

    // Find cases that have breached SLA
    const breachedCases = await this.prisma.case.findMany({
      where: {
        slaBreached: false,
        slaDeadline: { lte: now },
        status: { notIn: ['COMPLETED', 'REJECTED', 'DRAFT'] },
      },
    });

    for (const case_ of breachedCases) {
      await this.prisma.case.update({
        where: { id: case_.id },
        data: { slaBreached: true },
      });

      this.eventEmitter.emit(DomainEvents.CASE_SLA_BREACHED, {
        eventType: DomainEvents.CASE_SLA_BREACHED,
        firmId: case_.firmId,
        entityType: 'case',
        entityId: case_.id,
        data: { caseNumber: case_.caseNumber, slaDeadline: case_.slaDeadline },
      });
    }
  }
}

// Register recurring job on worker startup
@OnModuleInit()
async onModuleInit() {
  await this.slaQueue.add('check', {}, {
    repeat: { cron: '*/15 * * * *' },  // Every 15 minutes
  });
}
```

---

## Flow Summary

```
Case submitted by client
  ↓
CaseService.submitCase()
  ↓
eventEmitter.emit('case.submitted', payload)
  ↓
CaseEventListener.handleCaseSubmitted()   ← picks up event synchronously
  ↓
NotificationRuleEngine.evaluate()          ← determines recipients + channels
  ↓
BullMQ queue.add() × N                    ← one job per recipient per channel
  ↓
[Worker process]
  ↓
NotificationProcessor
  ├── IN_APP: Save to DB → Socket.io push to client
  └── EMAIL: Render template → Send via SES/SMTP
```

**Key property:** The CaseService never imports, references, or knows about the NotificationModule. The only coupling is the event name string. This means:
- Adding a new notification channel = zero changes to business modules
- Removing notifications entirely = delete the notification module, nothing breaks
- Testing case logic = no notification mocking needed
