import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateTagDto {
  @ApiProperty({ description: 'Tag name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Tag color (hex code)' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  color: string;
}
