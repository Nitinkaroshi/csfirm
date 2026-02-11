import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNotEmpty, IsUUID } from 'class-validator';

export class ManageDocumentTagsDto {
  @ApiProperty({ description: 'Tag IDs to add/remove' })
  @IsArray()
  @IsUUID('4', { each: true })
  @IsNotEmpty()
  tagIds: string[];
}
