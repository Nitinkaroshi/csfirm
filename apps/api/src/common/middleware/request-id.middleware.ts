import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    if (this.cls.isActive()) {
      this.cls.set('requestId', requestId);
    }
    res.setHeader('x-request-id', requestId);
    next();
  }
}
