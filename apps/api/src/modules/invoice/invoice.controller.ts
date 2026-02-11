import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, Res } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { FastifyReply } from 'fastify';
import { StaffRole, InvoiceStatus } from '@prisma/client';
import { InvoiceService } from './invoice.service';
import { PdfGeneratorService } from './pdf-generator.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { ParseUUIDPipe } from '../../common/pipes/parse-uuid.pipe';

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
export class InvoiceController {
  constructor(
    private readonly invoiceService: InvoiceService,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'List invoices' })
  async findAll(
    @CurrentFirm() firmId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: InvoiceStatus,
    @Query('organizationId') organizationId?: string,
    @Query('caseId') caseId?: string,
  ) {
    return this.invoiceService.findMany(firmId, { page, limit, status, organizationId, caseId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.findById(id);
  }

  @Post()
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Create invoice' })
  async create(@CurrentFirm() firmId: string, @Body() dto: CreateInvoiceDto) {
    return this.invoiceService.create(firmId, dto);
  }

  @Patch(':id/issue')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Issue invoice to client' })
  async issue(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.issue(id);
  }

  @Patch(':id/paid')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.MANAGER, StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Mark invoice as paid' })
  async markPaid(@Param('id', ParseUUIDPipe) id: string, @Body('paidAt') paidAt?: string) {
    return this.invoiceService.markPaid(id, paidAt);
  }

  @Patch(':id/cancel')
  @UseGuards(RbacGuard)
  @Roles(StaffRole.ADMIN, StaffRole.MASTER_ADMIN)
  @ApiOperation({ summary: 'Cancel invoice' })
  async cancel(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoiceService.cancel(id);
  }

  @Get(':id/pdf')
  @ApiOperation({ summary: 'Download invoice as PDF' })
  async downloadPdf(@Param('id', ParseUUIDPipe) id: string, @Res() reply: FastifyReply) {
    const invoice = await this.invoiceService.findById(id);
    const pdfBuffer = await this.pdfGenerator.generateInvoicePdf(invoice);

    reply.header('Content-Type', 'application/pdf');
    reply.header('Content-Disposition', `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`);
    reply.send(pdfBuffer);
  }
}
