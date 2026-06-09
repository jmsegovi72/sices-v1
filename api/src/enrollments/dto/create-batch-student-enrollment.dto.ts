import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsArray, ValidateNested } from 'class-validator';
import { CreateEnrollmentDto } from './create-enrollment.dto';

export class CreateBatchStudentEnrollmentDto {
  @IsArray({ message: 'El campo |enrollments| debe ser un arreglo.' })
  @ArrayNotEmpty({
    message: 'Debe incluir al menos un registro en el lote.',
  })
  @ValidateNested({ each: true })
  @Type(() => CreateEnrollmentDto)
  enrollments!: CreateEnrollmentDto[];
}
