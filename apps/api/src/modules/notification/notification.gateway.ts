import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger, Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { parse as parseCookie } from 'cookie';

@Injectable()
@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true,
  },
})
export class NotificationGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationGateway.name);
  private readonly userSocketMap = new Map<string, Set<string>>();

  constructor(private readonly jwtService: JwtService) {}

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
      if (!token) { client.disconnect(); return; }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;

      // Track user's socket connections
      if (!this.userSocketMap.has(payload.sub)) {
        this.userSocketMap.set(payload.sub, new Set());
      }
      this.userSocketMap.get(payload.sub)!.add(client.id);

      client.join(`user:${payload.sub}`);
      this.logger.log(`Notification client connected: ${payload.sub}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.userId) {
      const sockets = this.userSocketMap.get(client.data.userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.userSocketMap.delete(client.data.userId);
      }
    }
  }

  sendToUser(userId: string, notification: Record<string, unknown>) {
    this.server?.to(`user:${userId}`).emit('notification', notification);
  }
}
