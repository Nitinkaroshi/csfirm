import { Injectable, NestMiddleware } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(private readonly cls: ClsService) {}

  use(req: FastifyRequest['raw'] & { user?: { firmId?: string } }, _res: FastifyReply['raw'], next: () => void) {
    if (req.user?.firmId && this.cls.isActive()) {
      this.cls.set('firmId', req.user.firmId);
    }
    next();
  }
}
