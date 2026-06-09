import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  ValidateNested,
} from 'class-validator';
import { RequiredPositiveInt } from '@/common/decorators';

export class StudentMailUpdate {
  @RequiredPositiveInt({ fieldName: 'ID Alumno' })
  id!: number;

  @IsEmail({}, { message: 'El correo institucional no es válido.' })
  institutionalMail!: string;
}

export class UpdateBatchStudentMailsDto {
  @IsArray({ message: 'El campo |updatesMails| debe ser un arreglo.' })
  @ArrayNotEmpty({ message: 'Debe incluir al menos un registro en el lote.' })
  @ValidateNested({ each: true })
  @Type(() => StudentMailUpdate)
  updatesMails!: StudentMailUpdate[];
}
