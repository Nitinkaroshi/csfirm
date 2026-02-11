import { IsString, IsOptional, IsObject, IsArray, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceDto {
  @ApiProperty({ example: 'Company Incorporation' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 'INCORPORATION' })
  @IsString()
  category: string;

  @ApiPropertyOptional({ description: 'JSON form schema for dynamic forms' })
  @IsOptional()
  @IsObject()
  formSchema?: Record<string, unknown>;

  @ApiPropertyOptional({ example: ['MOA', 'AOA', 'PAN Card', 'Address Proof'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredDocuments?: string[];

  @ApiPropertyOptional({ description: 'SLA configuration in JSON' })
  @IsOptional()
  @IsObject()
  slaConfig?: Record<string, unknown>;

  @ApiPropertyOptional({ example: 15000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  basePrice?: number;
}
