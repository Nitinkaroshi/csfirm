import { Module } from '@nestjs/common';
import { InvoiceService } from './invoice.service';
import { InvoiceController } from './invoice.controller';
import { PdfGeneratorService } from './pdf-generator.service';

@Module({
  providers: [InvoiceService, PdfGeneratorService],
  controllers: [InvoiceController],
  exports: [InvoiceService],
})
export class InvoiceModule {}
