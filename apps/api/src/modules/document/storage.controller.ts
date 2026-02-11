import { Controller, Put, Get, Param, Req, Res, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { FastifyRequest, FastifyReply } from 'fastify';
import { LocalStorageService } from './local-storage.service';
import { Public } from '../../common/decorators';

/**
 * Handles local file upload/download when using STORAGE_TYPE=local.
 *
 * In production, files go directly to S3 via presigned URLs and this
 * controller is never called.
 */
@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  private readonly logger = new Logger(StorageController.name);

  constructor(private readonly storage: LocalStorageService) {}

  @Public()
  @Put('upload/:key')
  @ApiExcludeEndpoint()
  async upload(
    @Param('key') key: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    const decodedKey = decodeURIComponent(key);
    const chunks: Buffer[] = [];

    // Collect the raw body
    for await (const chunk of request.raw) {
      chunks.push(Buffer.from(chunk));
    }
    const data = Buffer.concat(chunks);

    this.storage.saveFile(decodedKey, data);
    this.logger.log(`Uploaded: ${decodedKey} (${data.length} bytes)`);

    reply.status(200).send({ ok: true });
  }

  @Public()
  @Get('files/:key')
  @ApiExcludeEndpoint()
  async download(
    @Param('key') key: string,
    @Res() reply: FastifyReply,
  ) {
    const decodedKey = decodeURIComponent(key);
    const data = this.storage.readFile(decodedKey);

    if (!data) {
      reply.status(404).send({ error: 'File not found' });
      return;
    }

    // Infer content type from extension
    const ext = decodedKey.split('.').pop()?.toLowerCase() || '';
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls: 'application/vnd.ms-excel',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
    };

    reply
      .header('Content-Type', contentTypes[ext] || 'application/octet-stream')
      .header('Content-Disposition', `inline; filename="${decodedKey.split('/').pop()}"`)
      .send(data);
  }
}
