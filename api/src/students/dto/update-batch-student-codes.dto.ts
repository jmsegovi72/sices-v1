import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  Matches,
  ValidateNested,
} from 'class-validator';
import { RequiredPositiveInt } from '@/common/decorators';
import { REGEX } from '@/common/helpers';

export class StudentCodeUpdate {
  @RequiredPositiveInt({ fieldName: 'ID Alumno' })
  id!: number;

  @Matches(REGEX.STUDENT_CODE, {
    message:
      'El valor de |codeNumber| debe tener el formato válido. Ejemplo: 24041234.',
  })
  codeNumber!: string; // ← actualizado de studentCodeNumber a codeNumber
}

export class UpdateBatchStudentCodesDto {
  @IsArray({ message: 'El campo |updatesCodes| debe ser un arreglo.' })
  @ArrayNotEmpty({ message: 'Debe incluir al menos un registro en el lote.' })
  @ValidateNested({ each: true })
  @Type(() => StudentCodeUpdate)
  updatesCodes!: StudentCodeUpdate[];
}
