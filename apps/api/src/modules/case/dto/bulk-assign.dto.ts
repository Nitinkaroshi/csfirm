import { IsArray, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BulkAssignDto {
  @ApiProperty({ type: [String], description: 'Array of case IDs' })
  @IsArray()
  @IsUUID('4', { each: true })
  caseIds: string[];

  @ApiProperty({ description: 'Employee profile ID to assign cases to' })
  @IsUUID()
  employeeProfileId: string;
}
