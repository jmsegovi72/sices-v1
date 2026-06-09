import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateStudentDto } from './create-student.dto';

export class CreateManyStudentDto {
  @IsArray({ message: 'El campo |students| debe ser un arreglo.' })
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un registro en el lote.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateStudentDto)
  students!: CreateStudentDto[];
}
