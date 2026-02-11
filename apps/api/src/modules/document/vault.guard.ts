import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { VaultService } from './vault.service';

@Injectable()
export class VaultGuard implements CanActivate {
  constructor(private readonly vaultService: VaultService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionId = request.headers['x-vault-session'] as string;
    const user = request.user;
    const caseId = request.params.caseId || request.params.id;

    if (!sessionId) {
      throw new ForbiddenException({
        code: 'VAULT_SESSION_REQUIRED',
        message: 'Vault session is required. Unlock the vault first.',
      });
    }

    const valid = await this.vaultService.verifySession(sessionId, user.userId, caseId);
    if (!valid) {
      throw new ForbiddenException({
        code: 'VAULT_SESSION_INVALID',
        message: 'Vault session is expired or invalid',
      });
    }

    return true;
  }
}
