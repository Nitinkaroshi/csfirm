import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsDate, IsOptional, IsUUID, IsArray, IsInt, IsEnum, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';
import { ComplianceType } from '@prisma/client';

export class CreateDeadlineDto {
  @ApiPropertyOptional({ description: 'Case ID (for case-specific deadlines)' })
  @IsUUID()
  @IsOptional()
  caseId?: string;

  @ApiPropertyOptional({ description: 'Organization ID (for org-wide deadlines)' })
  @IsUUID()
  @IsOptional()
  orgId?: string;

  @ApiProperty({ enum: ComplianceType, description: 'Type of compliance deadline' })
  @IsEnum(ComplianceType)
  @IsNotEmpty()
  type: ComplianceType;

  @ApiProperty({ description: 'Deadline title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ description: 'Detailed description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Due date for the deadline' })
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  dueDate: Date;

  @ApiPropertyOptional({ description: 'Days before due date to send reminders', default: [7, 3, 1] })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  reminderDays?: number[];

  @ApiPropertyOptional({ description: 'MCA form type (for MCA_FILING)' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  mcaFormType?: string;

  @ApiPropertyOptional({ description: 'MCA reference number' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  mcaReference?: string;
}
