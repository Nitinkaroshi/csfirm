import { PartialType } from '@nestjs/swagger';
import { CreateDeadlineDto } from './create-deadline.dto';

export class UpdateDeadlineDto extends PartialType(CreateDeadlineDto) {}
