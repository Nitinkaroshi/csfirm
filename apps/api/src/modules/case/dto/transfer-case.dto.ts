import { IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class TransferCaseDto {
  @ApiProperty()
  @IsUUID()
  toEmployeeId: string;

  @ApiProperty({ example: 'Employee specialization better matches case requirements' })
  @IsString()
  reason: string;
}
