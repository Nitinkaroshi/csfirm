import { IsUUID, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateOrderDto {
  @IsUUID()
  invoiceId: string;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsObject()
  notes?: Record<string, string>;
}
