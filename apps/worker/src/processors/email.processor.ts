import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ userId: string; firmId: string; title: string; body: string; to?: string }>) {
    this.logger.log(`Processing email job ${job.id}`);

    // Resolve recipient email if not provided
    let toEmail = job.data.to;
    if (!toEmail) {
      const user = await this.prisma.user.findUnique({ where: { id: job.data.userId } });
      toEmail = user?.email;
    }

    if (!toEmail) {
      this.logger.warn(`No email address found for user ${job.data.userId}`);
      return;
    }

    // Phase 1: Log email. Phase 2: Send via SMTP/SendGrid/SES
    this.logger.log(`[EMAIL] To: ${toEmail}, Subject: ${job.data.title}`);
    this.logger.debug(`[EMAIL] Body: ${job.data.body}`);

    // Record in notification table
    await this.prisma.notification.create({
      data: {
        userId: job.data.userId,
        firmId: job.data.firmId,
        title: job.data.title,
        body: job.data.body,
        channel: 'EMAIL',
        metadata: { jobId: job.id, sentTo: toEmail },
      },
    });
  }
}
