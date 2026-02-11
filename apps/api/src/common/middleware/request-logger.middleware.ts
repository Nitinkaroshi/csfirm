import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  constructor(private readonly cls: ClsService) {}

  use(req: FastifyRequest['raw'], res: FastifyReply['raw'], next: () => void) {
    const start = Date.now();
    const { method, url } = req;

    res.on('finish', () => {
      const duration = Date.now() - start;
      const requestId = this.cls.get('requestId');
      const firmId = this.cls.get('firmId');

      this.logger.log({
        message: `${method} ${url} ${res.statusCode} ${duration}ms`,
        requestId,
        firmId,
        method,
        url,
        statusCode: res.statusCode,
        duration,
      });
    });

    next();
  }
}
