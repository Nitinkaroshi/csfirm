import { IsString, IsUUID, IsOptional } from 'class-validator';

export class VerifyPaymentDto {
  @IsUUID()
  invoiceId: string;

  @IsString()
  razorpayOrderId: string;

  @IsString()
  razorpayPaymentId: string;

  @IsString()
  razorpaySignature: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}
