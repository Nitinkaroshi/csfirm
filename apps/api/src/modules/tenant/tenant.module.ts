import { Global, Module } from '@nestjs/common';
import { TenantContextService } from './tenant-context/tenant-context.service';
import { TenantService } from './tenant.service';
import { TenantController } from './tenant.controller';

@Global()
@Module({
  providers: [TenantContextService, TenantService],
  controllers: [TenantController],
  exports: [TenantContextService, TenantService],
})
export class TenantModule {}
