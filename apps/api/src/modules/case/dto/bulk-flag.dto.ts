import { IsArray, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkFlagDto {
  @ApiProperty({ type: [String], description: 'Array of case IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  caseIds: string[];

  @ApiProperty({ description: 'Flag name (e.g., URGENT, REVIEW_REQUIRED)' })
  @IsString()
  flag: string;
}
