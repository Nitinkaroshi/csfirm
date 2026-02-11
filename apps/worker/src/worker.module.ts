import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { NotificationProcessor } from './processors/notification.processor';
import { EmailProcessor } from './processors/email.processor';
import { SlaCheckProcessor } from './processors/sla-check.processor';
import { CleanupProcessor } from './processors/cleanup.processor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),

    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get<string>('REDIS_PASSWORD') || undefined,
          db: config.get<number>('REDIS_DB', 0),
        },
      }),
    }),

    BullModule.registerQueue(
      { name: 'notification' },
      { name: 'email' },
      { name: 'sla-check' },
      { name: 'cleanup' },
    ),

    PrismaModule,
  ],
  providers: [
    NotificationProcessor,
    EmailProcessor,
    SlaCheckProcessor,
    CleanupProcessor,
  ],
})
export class WorkerModule {}
