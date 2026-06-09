import { Type } from 'class-transformer';
import { IsArray, ValidateNested } from 'class-validator';
import { CreateTeachingLoadDto } from './create-teaching-load.dto';

export class BulkCreateTeachingLoadDto {
  @IsArray({ message: 'Los elementos de la carga académica deben enviarse en una lista.' })
  @ValidateNested({ each: true })
  @Type(() => CreateTeachingLoadDto)
  items!: CreateTeachingLoadDto[];
}
