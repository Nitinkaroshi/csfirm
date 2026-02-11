import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';
import { PrismaService } from '../../database/prisma.service';
import { ChatRoomType } from '@prisma/client';
import { parse as parseCookie } from 'cookie';

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  private extractToken(client: Socket): string | null {
    const cookieHeader = client.handshake.headers?.cookie;
    if (cookieHeader) {
      const cookies = parseCookie(cookieHeader);
      if (cookies.csfirm_access_token) return cookies.csfirm_access_token;
    }
    return client.handshake.auth?.token || client.handshake.headers?.authorization?.split(' ')[1] || null;
  }

  async handleConnection(client: Socket) {
    try {
      const token = this.extractToken(client);
      if (!token) throw new UnauthorizedException();

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.firmId = payload.firmId;
      client.data.type = payload.userType;
      client.data.staffRole = payload.role;

      this.logger.log(`Client connected: ${client.id} (user: ${payload.sub})`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_room')
  async handleJoinRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    const room = await this.prisma.chatRoom.findFirst({ where: { id: data.roomId } });
    if (!room) return;

    // CRITICAL: Clients cannot join internal rooms
    if (client.data.type === 'CLIENT' && room.roomType === ChatRoomType.INTERNAL_CASE) {
      return; // Silent failure — no error sent to client
    }

    client.join(data.roomId);
    this.logger.log(`User ${client.data.userId} joined room ${data.roomId}`);
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.leave(data.roomId);
  }

  @SubscribeMessage('send_message')
  async handleMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { roomId: string; content: string; type?: string },
  ) {
    const message = await this.chatService.sendMessage({
      roomId: data.roomId,
      senderId: client.data.userId,
      content: data.content,
    });

    // Broadcast to room members
    this.server.to(data.roomId).emit('new_message', message);
    return message;
  }

  @SubscribeMessage('typing')
  handleTyping(@ConnectedSocket() client: Socket, @MessageBody() data: { roomId: string }) {
    client.to(data.roomId).emit('user_typing', {
      userId: client.data.userId,
      roomId: data.roomId,
    });
  }
}
