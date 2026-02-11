import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateFirmDto } from './create-firm.dto';

export class UpdateFirmDto extends PartialType(OmitType(CreateFirmDto, ['slug'] as const)) {}
