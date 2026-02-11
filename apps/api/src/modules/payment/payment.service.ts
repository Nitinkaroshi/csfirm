import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Razorpay from 'razorpay';
import * as crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentService {
  private razorpay: Razorpay;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const keyId = this.config.get<string>('razorpay.keyId');
    const keySecret = this.config.get<string>('razorpay.keySecret');

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    this.razorpay = new Razorpay({
      key_id: keyId,
      key_secret: keySecret,
    });
  }

  /**
   * Create a Razorpay order for an invoice
   */
  async createOrder(firmId: string, dto: CreateOrderDto) {
    // Fetch invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, firmId },
      include: {
        organization: true,
        case_: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Check if invoice is already paid
    if (invoice.status === 'PAID') {
      throw new BadRequestException('Invoice already paid');
    }

    // Check if invoice is in valid state for payment
    if (invoice.status !== 'ISSUED') {
      throw new BadRequestException('Invoice must be issued before payment');
    }

    // Create Razorpay order
    const orderOptions = {
      amount: Math.round(Number(invoice.totalAmount) * 100), // Convert to paise
      currency: dto.currency || invoice.currency || 'INR',
      receipt: invoice.invoiceNumber,
      notes: {
        invoiceId: invoice.id,
        caseId: invoice.caseId,
        orgId: invoice.orgId,
        firmId: invoice.firmId,
        ...dto.notes,
      },
    };

    const order = await this.razorpay.orders.create(orderOptions);

    // Update invoice with order ID
    await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        razorpayOrderId: order.id,
        paymentAttempts: { increment: 1 },
      },
    });

    return {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        totalAmount: invoice.totalAmount,
      },
    };
  }

  /**
   * Verify Razorpay payment signature and update invoice
   */
  async verifyPayment(firmId: string, dto: VerifyPaymentDto) {
    // Fetch invoice
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: dto.invoiceId, firmId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // Verify signature
    const isValid = this.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid payment signature');
    }

    // Update invoice as paid
    const updatedInvoice = await this.prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        razorpayOrderId: dto.razorpayOrderId,
        razorpayPaymentId: dto.razorpayPaymentId,
        razorpaySignature: dto.razorpaySignature,
        paymentMethod: dto.paymentMethod,
      },
    });

    return {
      success: true,
      invoice: updatedInvoice,
    };
  }

  /**
   * Verify Razorpay signature
   */
  private verifySignature(
    orderId: string,
    paymentId: string,
    signature: string,
  ): boolean {
    const keySecret = this.config.get<string>('razorpay.keySecret');

    if (!keySecret) {
      throw new Error('Razorpay key secret not configured');
    }

    const body = `${orderId}|${paymentId}`;

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Get payment status for an invoice
   */
  async getPaymentStatus(firmId: string, invoiceId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id: invoiceId, firmId },
      select: {
        id: true,
        invoiceNumber: true,
        status: true,
        totalAmount: true,
        paidAt: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        paymentMethod: true,
        paymentAttempts: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    // If we have a payment ID, fetch details from Razorpay
    let paymentDetails = null;
    if (invoice.razorpayPaymentId) {
      try {
        paymentDetails = await this.razorpay.payments.fetch(
          invoice.razorpayPaymentId,
        );
      } catch (error) {
        // Silently ignore if payment details can't be fetched
      }
    }

    return {
      invoice,
      paymentDetails,
    };
  }

  /**
   * Handle Razorpay webhook events
   */
  async handleWebhook(payload: any, signature: string) {
    // Verify webhook signature
    const keySecret = this.config.get<string>('razorpay.webhookSecret');

    if (keySecret) {
      const expectedSignature = crypto
        .createHmac('sha256', keySecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      if (expectedSignature !== signature) {
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;

    // Handle payment.captured event
    if (event === 'payment.captured' && paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;

      // Find invoice by order ID
      const invoice = await this.prisma.invoice.findFirst({
        where: { razorpayOrderId: orderId },
      });

      if (invoice && invoice.status !== 'PAID') {
        await this.prisma.invoice.update({
          where: { id: invoice.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
            razorpayPaymentId: paymentId,
            paymentMethod: paymentEntity.method,
          },
        });
      }
    }

    return { received: true };
  }
}
