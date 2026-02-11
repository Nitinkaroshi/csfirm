import { ExceptionFilter, Catch, ArgumentsHost, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { FastifyReply } from 'fastify';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('PrismaException');

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();

    let status: number;
    let code: string;
    let message: string;

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        code = 'UNIQUE_CONSTRAINT_VIOLATION';
        const target = (exception.meta?.target as string[])?.join(', ') || 'unknown';
        message = `A record with this ${target} already exists`;
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        code = 'RECORD_NOT_FOUND';
        message = 'The requested record was not found';
        break;
      case 'P2003': {
        status = HttpStatus.BAD_REQUEST;
        code = 'FOREIGN_KEY_VIOLATION';
        const field = (exception.meta?.field_name as string) || 'unknown';
        message = `Invalid reference: ${field}`;
        break;
      }
      default:
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        code = 'DATABASE_ERROR';
        message = 'An unexpected database error occurred';
        this.logger.error(`Prisma error ${exception.code}`, exception.message);
    }

    response.status(status).send({
      success: false,
      error: { code, message },
    });
  }
}
