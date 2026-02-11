import { Injectable } from '@nestjs/common';
import { NotificationChannel } from '@prisma/client';
import { NotificationService } from '../notification.service';

@Injectable()
export class InAppChannel {
  constructor(private readonly notificationService: NotificationService) {}

  async send(params: { userId: string; firmId: string; title: string; body: string; metadata?: Record<string, unknown> }) {
    return this.notificationService.create({
      ...params,
      channel: NotificationChannel.IN_APP,
    });
  }
}
