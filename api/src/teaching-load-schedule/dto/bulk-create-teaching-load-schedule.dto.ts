import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTeachingLoadScheduleDto } from './create-teaching-load-schedule.dto';

export class BulkCreateTeachingLoadScheduleDto {
  @IsArray({ message: 'Los elementos de la programación horaria deben enviarse en una lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateTeachingLoadScheduleDto)
  items!: CreateTeachingLoadScheduleDto[];
}
