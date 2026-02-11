import { Module } from '@nestjs/common';
import { ServiceTemplateService } from './service-template.service';
import { ServiceTemplateController } from './service-template.controller';
import { ServiceTemplateRepository } from './service-template.repository';
import { FormSchemaValidator } from './validators/form-schema.validator';

@Module({
  providers: [ServiceTemplateService, ServiceTemplateRepository, FormSchemaValidator],
  controllers: [ServiceTemplateController],
  exports: [ServiceTemplateService, ServiceTemplateRepository],
})
export class ServiceTemplateModule {}
