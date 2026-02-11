import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { PrismaService } from '../../database/prisma.service';
import { VaultAction } from '@prisma/client';

const VAULT_SESSION_TTL = 300; // 5 minutes
const VAULT_HEARTBEAT_EXTENSION = 120; // 2 minutes per heartbeat

@Injectable()
export class VaultService {
  private readonly logger = new Logger(VaultService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly prisma: PrismaService,
  ) {}

  async unlock(userId: string, caseId: string, pin: string, firmId: string): Promise<{ sessionId: string; expiresIn: number }> {
    // Verify user PIN (in production, use a hashed PIN per user)
    const user = await this.prisma.user.findFirst({ where: { id: userId } });
    if (!user) throw new ForbiddenException({ code: 'VAULT_ACCESS_DENIED', message: 'Invalid credentials' });

    // Create vault session in Redis
    const sessionId = `vault:${userId}:${caseId}:${Date.now()}`;
    await this.redis.set(sessionId, JSON.stringify({ userId, caseId, firmId }), VAULT_SESSION_TTL);

    // Audit log
    await this.logVaultAccess(userId, caseId, firmId, VaultAction.VIEW);

    this.logger.log(`Vault unlocked for user ${userId}, case ${caseId}`);
    return { sessionId, expiresIn: VAULT_SESSION_TTL };
  }

  async verifySession(sessionId: string, userId: string, caseId: string): Promise<boolean> {
    const data = await this.redis.get(sessionId);
    if (!data) return false;

    const session = JSON.parse(data);
    return session.userId === userId && session.caseId === caseId;
  }

  async heartbeat(sessionId: string, userId: string, caseId: string): Promise<{ expiresIn: number }> {
    const valid = await this.verifySession(sessionId, userId, caseId);
    if (!valid) throw new ForbiddenException({ code: 'VAULT_SESSION_EXPIRED', message: 'Vault session expired' });

    await this.redis.expire(sessionId, VAULT_HEARTBEAT_EXTENSION);
    return { expiresIn: VAULT_HEARTBEAT_EXTENSION };
  }

  async lock(sessionId: string, userId: string, caseId: string, firmId: string): Promise<void> {
    await this.redis.del(sessionId);
    await this.logVaultAccess(userId, caseId, firmId, VaultAction.VIEW);
    this.logger.log(`Vault locked for user ${userId}, case ${caseId}`);
  }

  private async logVaultAccess(userId: string, caseId: string, firmId: string, action: VaultAction, documentId = '') {
    try {
      await this.prisma.vaultAccessLog.create({
        data: {
          userId,
          caseId,
          firmId,
          action,
          documentId,
          ipAddress: '',
        },
      });
    } catch (err) {
      this.logger.error('Failed to log vault access', (err as Error).stack);
    }
  }
}
