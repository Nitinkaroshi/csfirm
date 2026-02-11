import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';

@Processor('cleanup')
export class CleanupProcessor extends WorkerHost {
  private readonly logger = new Logger(CleanupProcessor.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async process(job: Job<{ type: string }>) {
    const { type } = job.data;
    this.logger.log(`Running cleanup: ${type}`);

    switch (type) {
      case 'expired_sessions':
        await this.cleanupExpiredSessions();
        break;
      case 'old_notifications':
        await this.cleanupOldNotifications();
        break;
      default:
        this.logger.warn(`Unknown cleanup type: ${type}`);
    }
  }

  private async cleanupExpiredSessions() {
    // Clean up expired refresh tokens (older than 30 days)
    const threshold = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.refreshToken.deleteMany({
      where: { expiresAt: { lt: threshold } },
    });
    this.logger.log(`Cleaned up ${result.count} expired refresh tokens`);
  }

  private async cleanupOldNotifications() {
    // Delete read notifications older than 90 days
    const threshold = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const result = await this.prisma.notification.deleteMany({
      where: { readAt: { not: null }, createdAt: { lt: threshold } },
    });
    this.logger.log(`Cleaned up ${result.count} old read notifications`);
  }
}
