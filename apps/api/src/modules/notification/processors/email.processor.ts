import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../database/prisma.service';
import { EmailChannel } from '../channels/email.channel';
import { QUEUE_NAMES } from '../../../common/constants/queues.constants';

interface EmailJobData {
  userId: string;
  firmId: string;
  title: string;
  body: string;
  eventName: string;
}

@Processor(QUEUE_NAMES.EMAIL)
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly emailChannel: EmailChannel,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { userId, title, body } = job.data;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, firstName: true },
    });

    if (!user) {
      this.logger.warn(`User ${userId} not found, skipping email`);
      return;
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #1a1a2e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">CSFIRM</h1>
        </div>
        <div style="padding: 24px; background: #ffffff;">
          <p>Hi ${user.firstName || 'there'},</p>
          <h2 style="color: #1a1a2e; margin-top: 16px;">${title}</h2>
          <p style="color: #555; line-height: 1.6;">${body}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px;">
            This is an automated notification from CSFIRM. Please do not reply to this email.
          </p>
        </div>
      </div>
    `.trim();

    await this.emailChannel.send({
      to: user.email,
      subject: `CSFIRM - ${title}`,
      html,
    });
  }
}
