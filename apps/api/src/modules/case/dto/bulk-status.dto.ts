import { IsArray, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CaseStatus } from '@prisma/client';

export class BulkStatusDto {
  @ApiProperty({ type: [String], description: 'Array of case IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  caseIds: string[];

  @ApiProperty({ enum: CaseStatus, description: 'New status for all cases' })
  @IsEnum(CaseStatus)
  status: CaseStatus;
}
