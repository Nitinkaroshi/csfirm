import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const SLOW_REQUEST_THRESHOLD_MS = 1000;

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Performance');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    const start = Date.now();

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        if (duration > SLOW_REQUEST_THRESHOLD_MS) {
          this.logger.warn(`Slow request: ${method} ${url} took ${duration}ms`, {
            method,
            url,
            duration,
            userId: request.user?.userId,
            firmId: request.user?.firmId,
          });
        }
      }),
    );
  }
}
