import { Controller, Post, Body, Param, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { VaultService } from './vault.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Vault')
@ApiBearerAuth()
@Controller('vault')
export class VaultController {
  constructor(private readonly vaultService: VaultService) {}

  @Post(':caseId/unlock')
  @ApiOperation({ summary: 'Unlock vault for a case (starts timed session)' })
  async unlock(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser('userId') userId: string,
    @CurrentFirm() firmId: string,
    @Body('pin') pin: string,
  ) {
    return this.vaultService.unlock(userId, caseId, pin, firmId);
  }

  @Post(':caseId/heartbeat')
  @ApiOperation({ summary: 'Extend vault session' })
  async heartbeat(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser('userId') userId: string,
    @Headers('x-vault-session') sessionId: string,
  ) {
    return this.vaultService.heartbeat(sessionId, userId, caseId);
  }

  @Post(':caseId/lock')
  @ApiOperation({ summary: 'Manually lock vault session' })
  async lock(
    @Param('caseId', ParseUUIDPipe) caseId: string,
    @CurrentUser('userId') userId: string,
    @CurrentFirm() firmId: string,
    @Headers('x-vault-session') sessionId: string,
  ) {
    return this.vaultService.lock(sessionId, userId, caseId, firmId);
  }
}
