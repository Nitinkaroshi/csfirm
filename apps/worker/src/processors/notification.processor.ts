import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationChannel } from '@prisma/client';

@Processor('notification')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ userId: string; firmId: string; title: string; body: string; eventName: string }>) {
    this.logger.log(`Processing notification job ${job.id} for user ${job.data.userId}`);

    await this.prisma.notification.create({
      data: {
        userId: job.data.userId,
        firmId: job.data.firmId,
        title: job.data.title,
        body: job.data.body,
        channel: NotificationChannel.IN_APP,
        metadata: { eventName: job.data.eventName, jobId: job.id },
      },
    });

    this.logger.log(`Notification job ${job.id} completed`);
  }
}
