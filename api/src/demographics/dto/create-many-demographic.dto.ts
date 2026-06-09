import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateDemographicDto } from './create-demographic.dto';

export class CreateManyDemographicDto {
  @IsArray({ message: 'El campo |demographics| debe ser un arreglo.' })
  @ArrayNotEmpty({ message: 'Debe incluir al menos un registro en el lote.' })
  @ValidateNested({ each: true })
  @Type(() => CreateDemographicDto)
  demographics!: CreateDemographicDto[];
}
