import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AUDIT_ACTION_KEY } from '../decorators/audit-action.decorator';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private reflector: Reflector,
    private eventEmitter: EventEmitter2,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditAction = this.reflector.get<string>(AUDIT_ACTION_KEY, context.getHandler());
    if (!auditAction) return next.handle();

    const request = context.switchToHttp().getRequest();
    const { method, url, body, params, query } = request;
    const user = request.user;

    return next.handle().pipe(
      tap((response) => {
        this.eventEmitter.emit('audit.log', {
          action: auditAction,
          userId: user?.userId,
          firmId: user?.firmId,
          method,
          url,
          params,
          query,
          body: this.sanitizeBody(body),
          responseId: (response as Record<string, unknown>)?.id,
          timestamp: new Date(),
        });
      }),
    );
  }

  private sanitizeBody(body: Record<string, unknown>): Record<string, unknown> {
    if (!body) return body;
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'currentPassword', 'newPassword', 'token', 'refreshToken'];
    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }
}
