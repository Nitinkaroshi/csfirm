import { Injectable } from '@nestjs/common';
import { Prisma, NotificationChannel } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { NotificationGateway } from './notification.gateway';

@Injectable()
export class NotificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: NotificationGateway,
  ) {}

  async create(params: {
    userId: string;
    firmId: string;
    title: string;
    body: string;
    channel: NotificationChannel;
    eventType?: string;
    metadata?: Record<string, unknown>;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: params.userId,
        firmId: params.firmId,
        title: params.title,
        body: params.body,
        channel: params.channel,
        eventType: params.eventType || 'general',
        metadata: (params.metadata as Prisma.InputJsonValue) || {},
      },
    });

    // Push real-time via WebSocket
    if (params.channel === NotificationChannel.IN_APP) {
      this.gateway.sendToUser(params.userId, notification);
    }

    return notification;
  }

  async findByUser(userId: string, query: { page?: number; limit?: number; unreadOnly?: boolean }) {
    const { page = 1, limit = 20, unreadOnly } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = { userId };
    if (unreadOnly) where.isRead = false;

    const [data, total, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.notification.count({ where }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit), unreadCount },
    };
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }

  async markAsRead(id: string, userId: string) {
    return this.prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true, readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }
}
