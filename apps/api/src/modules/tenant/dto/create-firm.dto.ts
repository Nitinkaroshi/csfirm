import { IsString, IsOptional, IsInt, Min, Max, MaxLength, Matches, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFirmDto {
  @ApiProperty({ example: 'Acme CS Solutions' })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'acme-cs', description: 'URL-safe slug for subdomain' })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug must be lowercase alphanumeric with hyphens only',
  })
  slug: string;

  @ApiPropertyOptional({ example: 'acme.csfirm.com' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  domain?: string;

  @ApiPropertyOptional({ example: 'professional', default: 'trial' })
  @IsOptional()
  @IsString()
  subscriptionPlan?: string;

  @ApiPropertyOptional({ example: 25, default: 10 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxUsers?: number;

  @ApiPropertyOptional({ example: 10, default: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  maxStorageGb?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  settings?: Record<string, any>;
}
