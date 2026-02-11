import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class MoveDocumentDto {
  @ApiPropertyOptional({ description: 'Target folder ID (null for root)' })
  @IsUUID()
  @IsOptional()
  folderId?: string | null;
}
