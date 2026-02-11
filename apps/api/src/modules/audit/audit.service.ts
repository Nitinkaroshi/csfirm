import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { AuditAction, VaultAction } from '@prisma/client';

interface AuditLogInput {
  firmId: string;
  actorId: string;
  actorRole: string;
  entityType: string;
  entityId: string;
  action: AuditAction;
  beforeState?: any;
  afterState?: any;
  changeSummary?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

interface VaultAccessInput {
  firmId: string;
  userId: string;
  documentId: string;
  caseId: string;
  action: VaultAction;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(entry: AuditLogInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          firmId: entry.firmId,
          actorId: entry.actorId,
          actorRole: entry.actorRole,
          entityType: entry.entityType,
          entityId: entry.entityId,
          action: entry.action,
          beforeState: entry.beforeState || undefined,
          afterState: entry.afterState || undefined,
          changeSummary: entry.changeSummary,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
        },
      });
    } catch (error) {
      // Audit logging must never break the request
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async logVaultAccess(entry: VaultAccessInput): Promise<void> {
    try {
      await this.prisma.vaultAccessLog.create({
        data: {
          firmId: entry.firmId,
          userId: entry.userId,
          documentId: entry.documentId,
          caseId: entry.caseId,
          action: entry.action,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          sessionId: entry.sessionId,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write vault access log: ${(error as Error).message}`, (error as Error).stack);
    }
  }

  async queryAuditLogs(
    firmId: string,
    filters: {
      entityType?: string;
      entityId?: string;
      actorId?: string;
      action?: AuditAction;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { firmId };
    if (filters.entityType) where.entityType = filters.entityType;
    if (filters.entityId) where.entityId = filters.entityId;
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.action) where.action = filters.action;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async queryVaultLogs(
    firmId: string,
    filters: {
      documentId?: string;
      userId?: string;
      caseId?: string;
      action?: VaultAction;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
    },
  ) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const where: any = { firmId };
    if (filters.documentId) where.documentId = filters.documentId;
    if (filters.userId) where.userId = filters.userId;
    if (filters.caseId) where.caseId = filters.caseId;
    if (filters.action) where.action = filters.action;
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [items, total] = await Promise.all([
      this.prisma.vaultAccessLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.vaultAccessLog.count({ where }),
    ]);

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
