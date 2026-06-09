import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateGradeDto } from './create-grade.dto';

export class CreateManyGradesDto {
  @IsArray({ message: 'El campo |grades| debe ser un arreglo.' })
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un registro en el lote.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateGradeDto)
  grades!: CreateGradeDto[];
}
