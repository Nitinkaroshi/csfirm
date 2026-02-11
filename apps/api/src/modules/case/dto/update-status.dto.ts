import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';

export class UpdateStatusDto {
  @ApiProperty({ enum: CaseStatus })
  @IsEnum(CaseStatus)
  status: CaseStatus;

  @ApiPropertyOptional({ description: 'Required for rejection transitions' })
  @IsOptional()
  @IsString()
  reason?: string;
}
