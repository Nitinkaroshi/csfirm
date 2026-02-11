import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @ApiProperty({ description: 'Case ID this folder belongs to' })
  @IsUUID()
  @IsNotEmpty()
  caseId: string;

  @ApiProperty({ description: 'Folder name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Parent folder ID (for nested folders)' })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Folder color (hex code)' })
  @IsString()
  @IsOptional()
  @MaxLength(20)
  color?: string;
}
