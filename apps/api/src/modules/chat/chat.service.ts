import { Injectable, NotFoundException } from '@nestjs/common';
import { ChatRoomType, MessageType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '../../common/constants/events.constants';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createCaseRooms(caseId: string, firmId: string, clientUserId?: string) {
    // Create CLIENT_FACING room
    const clientRoom = await this.prisma.chatRoom.create({
      data: {
        caseId,
        firmId,
        roomType: ChatRoomType.CLIENT_CASE,
        name: 'Client Discussion',
      },
    });

    // Create INTERNAL room
    const internalRoom = await this.prisma.chatRoom.create({
      data: {
        caseId,
        firmId,
        roomType: ChatRoomType.INTERNAL_CASE,
        name: 'Internal Discussion',
      },
    });

    // Add client to client-facing room only (NOT internal)
    if (clientUserId) {
      await this.prisma.chatRoomMember.create({
        data: { roomId: clientRoom.id, userId: clientUserId },
      });
    }

    return { clientRoom, internalRoom };
  }

  async addMemberToRoom(roomId: string, userId: string) {
    return this.prisma.chatRoomMember.create({
      data: { roomId, userId },
    });
  }

  async getRoomsForCase(caseId: string, userId: string, isStaff: boolean) {
    if (isStaff) {
      // Staff see both rooms
      return this.prisma.chatRoom.findMany({
        where: { caseId },
        include: {
          members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
          _count: { select: { messages: true } },
        },
      });
    }

    // Client ONLY sees CLIENT_FACING rooms — returns 404 for internal rooms
    return this.prisma.chatRoom.findMany({
      where: { caseId, roomType: ChatRoomType.CLIENT_CASE },
      include: {
        members: { include: { user: { select: { id: true, firstName: true, lastName: true } } } },
        _count: { select: { messages: true } },
      },
    });
  }

  async getMessages(roomId: string, cursor?: string, limit = 50) {
    const where: Record<string, unknown> = { roomId };
    if (cursor) {
      where.createdAt = { lt: new Date(cursor) };
    }

    const messages = await this.prisma.chatMessage.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, userType: true } },
      },
    });

    return {
      data: messages.reverse(),
      meta: {
        hasMore: messages.length === limit,
        cursor: messages.length > 0 ? messages[0].createdAt.toISOString() : null,
      },
    };
  }

  async sendMessage(params: {
    roomId: string;
    senderId: string;
    content: string;
    type?: MessageType;
    metadata?: Record<string, unknown>;
  }) {
    const { roomId, senderId, content, type = MessageType.TEXT, metadata } = params;

    const room = await this.prisma.chatRoom.findFirst({ where: { id: roomId } });
    if (!room) throw new NotFoundException({ code: 'ROOM_NOT_FOUND', message: 'Chat room not found' });

    const message = await this.prisma.chatMessage.create({
      data: {
        roomId,
        senderId,
        content,
        messageType: type,
        metadata: metadata ? (metadata as any) : undefined,
      },
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, userType: true } },
      },
    });

    this.eventEmitter.emit(DomainEvents.CHAT_MESSAGE_SENT, {
      message,
      room,
    });

    return message;
  }
}
