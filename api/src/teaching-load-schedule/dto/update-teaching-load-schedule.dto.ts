import { PartialType } from '@nestjs/mapped-types';
import { CreateTeachingLoadScheduleDto } from './create-teaching-load-schedule.dto';

export class UpdateTeachingLoadScheduleDto extends PartialType(
  CreateTeachingLoadScheduleDto,
) {}
