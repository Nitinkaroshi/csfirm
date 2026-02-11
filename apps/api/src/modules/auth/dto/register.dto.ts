import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsEnum,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserType } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'john@acme.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'SecureP@ss123', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain at least one lowercase, one uppercase, and one digit',
  })
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty({ enum: UserType, example: UserType.STAFF })
  @IsEnum(UserType)
  userType: UserType;

  @ApiProperty({ example: 'acme-cs', description: 'Firm slug to register under' })
  @IsString()
  firmSlug: string;

  // Staff-specific fields
  @ApiPropertyOptional({ example: 'EMPLOYEE', description: 'Required for STAFF users' })
  @IsOptional()
  @IsString()
  role?: string;

  // Client-specific fields
  @ApiPropertyOptional({ example: 'Acme Corp', description: 'Required for CLIENT users' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  orgName?: string;

  @ApiPropertyOptional({ example: 'pvt_ltd' })
  @IsOptional()
  @IsString()
  orgType?: string;
}
