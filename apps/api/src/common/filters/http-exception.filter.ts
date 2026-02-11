import { ExceptionFilter, Catch, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { FastifyReply, FastifyRequest } from 'fastify';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorBody = typeof exceptionResponse === 'string'
      ? { code: 'HTTP_ERROR', message: exceptionResponse }
      : (exceptionResponse as Record<string, unknown>);

    const errorResponse = {
      success: false,
      error: {
        code: errorBody.code || `HTTP_${status}`,
        message: errorBody.message || exception.message,
        ...(process.env.NODE_ENV !== 'production' && { stack: exception.stack }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
        method: request.method,
      },
    };

    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} ${status}`, exception.stack);
    }

    response.status(status).send(errorResponse);
  }
}
