import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { ChatRoomType } from '@prisma/client';

@Injectable()
export class RoomAccessGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const roomId = request.params.roomId;

    if (!roomId) return true;

    const room = await this.prisma.chatRoom.findFirst({ where: { id: roomId } });

    if (!room) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Chat room not found' });
    }

    // CRITICAL: Client users NEVER see internal rooms — return 404 (not 403)
    // This prevents information leakage about room existence
    if (user.type === 'CLIENT' && room.roomType === ChatRoomType.INTERNAL_CASE) {
      throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Chat room not found' });
    }

    return true;
  }
}
