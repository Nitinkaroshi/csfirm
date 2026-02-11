import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { CurrentFirm } from '../../common/decorators/current-firm.decorator';
import { PaymentService } from './payment.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('create-order')
  @UseGuards(RbacGuard)
  @ApiOperation({ summary: 'Create Razorpay order for invoice payment' })
  async createOrder(@CurrentFirm() firmId: string, @Body() dto: CreateOrderDto) {
    return this.paymentService.createOrder(firmId, dto);
  }

  @Post('verify')
  @UseGuards(RbacGuard)
  @ApiOperation({ summary: 'Verify Razorpay payment and update invoice status' })
  async verifyPayment(@CurrentFirm() firmId: string, @Body() dto: VerifyPaymentDto) {
    return this.paymentService.verifyPayment(firmId, dto);
  }

  @Get('status/:invoiceId')
  @UseGuards(RbacGuard)
  @ApiOperation({ summary: 'Get payment status for an invoice' })
  async getPaymentStatus(@CurrentFirm() firmId: string, @Param('invoiceId') invoiceId: string) {
    return this.paymentService.getPaymentStatus(firmId, invoiceId);
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Handle Razorpay webhook events' })
  async handleWebhook(
    @Body() payload: any,
    @Headers('x-razorpay-signature') signature: string,
  ) {
    return this.paymentService.handleWebhook(payload, signature);
  }
}
