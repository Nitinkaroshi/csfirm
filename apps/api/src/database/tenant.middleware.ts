import { Prisma, PrismaClient } from '@prisma/client';
import { ClsServiceManager } from 'nestjs-cls';

// Models that are scoped to a firm (tenant)
const TENANT_SCOPED_MODELS = [
  'User',
  'Organization',
  'OrgUser',
  'ServiceTemplate',
  'Case',
  'CaseDocument',
  'CaseTransferLog',
  'ChatRoom',
  'ChatMessage',
  'Invoice',
  'Notification',
  'EmployeeProfile',
];

// Models that are NOT tenant-scoped (global)
// Firm, RefreshToken, AuditLog, VaultAccessLog

export function registerTenantMiddleware(prisma: PrismaClient) {
  prisma.$use(async (params: Prisma.MiddlewareParams, next: (params: Prisma.MiddlewareParams) => Promise<unknown>) => {
    const cls = ClsServiceManager.getClsService();
    const firmId = cls?.get('firmId');

    // Skip if no tenant context (e.g., during auth, seeding, or platform admin ops)
    if (!firmId) return next(params);

    // Skip for non-tenant-scoped models
    if (!params.model || !TENANT_SCOPED_MODELS.includes(params.model)) return next(params);

    // Inject firmId into queries
    switch (params.action) {
      case 'findUnique':
      case 'findFirst': {
        // Convert findUnique to findFirst to support firmId filter
        // (firmId is not part of the unique constraint)
        if (params.action === 'findUnique') {
          params.action = 'findFirst';
        }
        params.args.where = { ...params.args.where, firmId };
        break;
      }
      case 'findMany':
      case 'count': {
        params.args.where = { ...params.args.where, firmId };
        break;
      }
      case 'create': {
        // Auto-inject firmId into new records if not already set
        if (params.args.data && !params.args.data.firmId && !params.args.data.firm) {
          params.args.data.firmId = firmId;
        }
        break;
      }
      case 'createMany': {
        if (Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((d: Record<string, unknown>) => ({
            ...d,
            firmId: d.firmId || firmId,
          }));
        }
        break;
      }
      case 'update':
      case 'delete': {
        // For update/delete by ID, add firmId to where
        // This prevents cross-tenant modifications
        if (params.args.where) {
          params.args.where = { ...params.args.where, firmId };
        }
        break;
      }
      case 'updateMany':
      case 'deleteMany': {
        params.args.where = { ...params.args.where, firmId };
        break;
      }
    }

    return next(params);
  });
}
