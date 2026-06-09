import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreatePersonDto } from './create-person.dto';

export class CreateManyPersonDto {
  @IsArray({ message: 'El campo |persons| debe ser un arreglo.' })
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un registro en el lote.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreatePersonDto)
  persons!: CreatePersonDto[];
}
