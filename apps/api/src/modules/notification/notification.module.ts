import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullModule } from '@nestjs/bullmq';
import { NotificationService } from './notification.service';
import { NotificationController } from './notification.controller';
import { NotificationGateway } from './notification.gateway';
import { NotificationRuleEngine } from './notification-rule-engine';
import { NotificationEventListener } from './listeners/notification-event.listener';
import { InAppChannel } from './channels/in-app.channel';
import { EmailChannel } from './channels/email.channel';
import { EmailProcessor } from './processors/email.processor';
import { QUEUE_NAMES } from '../../common/constants/queues.constants';

@Module({
  imports: [
    JwtModule.register({}),
    BullModule.registerQueue(
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.EMAIL },
    ),
  ],
  providers: [
    NotificationService,
    NotificationGateway,
    NotificationRuleEngine,
    NotificationEventListener,
    InAppChannel,
    EmailChannel,
    EmailProcessor,
  ],
  controllers: [NotificationController],
  exports: [NotificationService],
})
export class NotificationModule {}
