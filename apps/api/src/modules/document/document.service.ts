import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { Prisma, DocumentSecurityLevel, DocumentStatus } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma.service';
import { STORAGE_SERVICE, StorageProvider } from './storage.provider';
import { DomainEvents } from '../../common/constants/events.constants';

@Injectable()
export class DocumentService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageProvider,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string) {
    const doc = await this.prisma.caseDocument.findFirst({ where: { id } });
    if (!doc) throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: 'Document not found' });
    return doc;
  }

  async findByCase(caseId: string, securityLevel?: DocumentSecurityLevel) {
    const where: Prisma.CaseDocumentWhereInput = { caseId };
    if (securityLevel) where.securityLevel = securityLevel;
    return this.prisma.caseDocument.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async requestUploadUrl(params: {
    caseId: string;
    firmId: string;
    userId: string;
    filename: string;
    contentType: string;
    securityLevel: DocumentSecurityLevel;
    category?: string;
  }) {
    const { caseId, firmId, userId, filename, contentType, securityLevel, category } = params;
    const s3Key = this.storage.buildKey(firmId, caseId, filename);
    const uploadUrl = await this.storage.getUploadUrl(s3Key, contentType);

    const doc = await this.prisma.caseDocument.create({
      data: {
        caseId,
        firmId,
        uploadedBy: userId,
        fileName: filename,
        fileType: contentType,
        fileSizeBytes: BigInt(0),
        mimeType: contentType,
        s3Bucket: 'csfirm-documents',
        s3Key,
        documentType: category || 'general',
        securityLevel,
        status: DocumentStatus.ACTIVE,
      },
    });

    this.eventEmitter.emit(DomainEvents.DOCUMENT_UPLOADED, { document: doc, firmId });
    return { document: doc, uploadUrl };
  }

  async confirmUpload(id: string, fileSize: number) {
    return this.prisma.caseDocument.update({
      where: { id },
      data: { fileSizeBytes: BigInt(fileSize) },
    });
  }

  async getDownloadUrl(id: string) {
    const doc = await this.findById(id);
    const url = await this.storage.getDownloadUrl(doc.s3Key);
    return { url, document: doc };
  }

  async verify(id: string, verifiedById: string) {
    const updated = await this.prisma.caseDocument.update({
      where: { id },
      data: { isVerified: true, verifiedById, verifiedAt: new Date() },
    });
    this.eventEmitter.emit(DomainEvents.DOCUMENT_VERIFIED, { document: updated });
    return updated;
  }

  async reject(id: string, reason: string) {
    return this.prisma.caseDocument.update({
      where: { id },
      data: { status: DocumentStatus.ARCHIVED, description: reason },
    });
  }

  async delete(id: string) {
    const doc = await this.findById(id);
    await this.storage.deleteObject(doc.s3Key);
    return this.prisma.caseDocument.delete({ where: { id } });
  }
}
