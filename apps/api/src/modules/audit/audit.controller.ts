import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles, CurrentFirm } from '../../common/decorators';
import { AuditAction, VaultAction } from '@prisma/client';

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(JwtAuthGuard, TenantGuard, RbacGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @Roles('ADMIN', 'MASTER_ADMIN')
  async queryAuditLogs(
    @CurrentFirm() firmId: string,
    @Query('entityType') entityType?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: AuditAction,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.queryAuditLogs(firmId, {
      entityType,
      entityId,
      actorId,
      action,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit,
    });
  }

  @Get('vault')
  @Roles('ADMIN', 'MASTER_ADMIN')
  async queryVaultLogs(
    @CurrentFirm() firmId: string,
    @Query('documentId') documentId?: string,
    @Query('userId') userId?: string,
    @Query('caseId') caseId?: string,
    @Query('action') action?: VaultAction,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.queryVaultLogs(firmId, {
      documentId,
      userId,
      caseId,
      action,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit,
    });
  }
}
