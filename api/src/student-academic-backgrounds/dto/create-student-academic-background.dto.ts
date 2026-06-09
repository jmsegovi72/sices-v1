import { IsDecimal, IsOptional } from 'class-validator';
import { OptionalPositiveInt, RequiredPositiveInt } from '@/common/decorators';

export class CreateStudentAcademicBackgroundDto {
  // 🔹 ALUMNO
  @RequiredPositiveInt({ fieldName: 'Alumno' })
  studentId!: number;

  // 🔹 ESCUELA DE PROCEDENCIA
  @RequiredPositiveInt({ fieldName: 'Escuela de procedencia' })
  schoolOfOriginId!: number;

  // 🔹 GRADO PROFESIONAL
  @OptionalPositiveInt({ fieldName: 'Grado profesional' })
  professionalDegreeId?: number;

  // 🔹 PROMEDIO
  @IsOptional()
  @IsDecimal(
    { decimal_digits: '0,2' },
    {
      message:
        'El campo |promedio| debe ser un número decimal con máximo 2 decimales.',
    },
  )
  average?: string;
}
