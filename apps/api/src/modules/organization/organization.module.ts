import { Module } from '@nestjs/common';
import { OrganizationService } from './organization.service';
import { OrganizationController } from './organization.controller';
import { OrganizationRepository } from './organization.repository';

@Module({
  providers: [OrganizationService, OrganizationRepository],
  controllers: [OrganizationController],
  exports: [OrganizationService, OrganizationRepository],
})
export class OrganizationModule {}
