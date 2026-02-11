import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, InvoiceStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainEvents } from '../../common/constants/events.constants';
import { CreateInvoiceDto } from './dto/create-invoice.dto';

const GST_RATE = 0.18; // 18% GST

@Injectable()
export class InvoiceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findById(id: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id },
      include: {
        case_: { select: { id: true, caseNumber: true, status: true } },
        organization: { select: { id: true, name: true } },
      },
    });
    if (!invoice) throw new NotFoundException({ code: 'INVOICE_NOT_FOUND', message: 'Invoice not found' });
    return invoice;
  }

  async findMany(firmId: string, query: {
    page?: number;
    limit?: number;
    status?: InvoiceStatus;
    organizationId?: string;
    caseId?: string;
  }) {
    const { page = 1, limit = 20, status, organizationId, caseId } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = { firmId };
    if (status) where.status = status;
    if (organizationId) where.orgId = organizationId;
    if (caseId) where.caseId = caseId;

    const [data, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where, skip, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          case_: { select: { id: true, caseNumber: true, status: true } },
          organization: { select: { id: true, name: true } },
        },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async create(firmId: string, dto: CreateInvoiceDto) {
    const invoiceNumber = await this.generateInvoiceNumber(firmId);

    // Look up the case to get serviceId and orgId
    const caseRecord = await this.prisma.case.findFirst({ where: { id: dto.caseId } });
    if (!caseRecord) throw new NotFoundException({ code: 'CASE_NOT_FOUND', message: 'Case not found' });

    const subtotal = dto.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const taxAmount = subtotal * GST_RATE;
    const totalAmount = subtotal + taxAmount;

    const invoice = await this.prisma.invoice.create({
      data: {
        invoiceNumber,
        firmId,
        caseId: dto.caseId,
        orgId: dto.organizationId || caseRecord.orgId,
        serviceId: caseRecord.serviceId,
        amount: subtotal,
        taxBreakup: { lineItems: dto.lineItems, taxRate: GST_RATE, taxAmount } as any,
        totalAmount,
        status: InvoiceStatus.DRAFT,
        dueDate: dto.dueDate ? new Date(dto.dueDate) : null,
        notes: dto.notes,
        metadata: {},
      },
      include: {
        case_: { select: { id: true, caseNumber: true, status: true } },
        organization: { select: { id: true, name: true } },
      },
    });

    this.eventEmitter.emit(DomainEvents.INVOICE_CREATED, { invoice, firmId });
    return invoice;
  }

  async issue(id: string) {
    const invoice = await this.findById(id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Only draft invoices can be issued' });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.ISSUED, issuedAt: new Date() },
    });

    this.eventEmitter.emit(DomainEvents.INVOICE_ISSUED, { invoice: updated });
    return updated;
  }

  async markPaid(id: string, paidAt?: string) {
    const invoice = await this.findById(id);
    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException({ code: 'INVALID_STATUS', message: 'Only issued invoices can be marked as paid' });
    }

    const updated = await this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.PAID, paidAt: paidAt ? new Date(paidAt) : new Date() },
    });

    this.eventEmitter.emit(DomainEvents.INVOICE_PAID, { invoice: updated });
    return updated;
  }

  async cancel(id: string) {
    const invoice = await this.findById(id);
    if (invoice.status === InvoiceStatus.PAID) {
      throw new BadRequestException({ code: 'CANNOT_CANCEL_PAID', message: 'Cannot cancel a paid invoice' });
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: InvoiceStatus.CANCELLED },
    });
  }

  private async generateInvoiceNumber(firmId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const count = await this.prisma.invoice.count({
      where: {
        firmId,
        createdAt: {
          gte: new Date(`${year}-01-01`),
          lt: new Date(`${year + 1}-01-01`),
        },
      },
    });
    const seq = String(count + 1).padStart(4, '0');
    return `INV-${year}${month}-${seq}`;
  }
}
