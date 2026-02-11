import { IsString, IsOptional, IsObject, ValidateNested, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

class PrimaryContactDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class CreateOrganizationDto {
  @ApiProperty({ example: 'Acme Pvt Ltd' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'U12345MH2020PTC123456' })
  @IsOptional()
  @IsString()
  cin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  incorporationDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  registeredAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;

  @ApiPropertyOptional({ type: PrimaryContactDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => PrimaryContactDto)
  primaryContact?: PrimaryContactDto;
}
