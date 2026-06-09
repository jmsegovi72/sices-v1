// create-enrollment.dto.ts
import { IsOptional, Matches } from 'class-validator';
import { RequiredPositiveInt, StrictISODate } from '@/common/decorators';
import { REGEX } from '@/common/helpers';

export class CreateEnrollmentDto {
  // 🔹 ALUMNO
  @RequiredPositiveInt({ fieldName: 'Alumno' })
  studentId!: number;

  // 🔹 CLASE
  @Matches(REGEX.CLASS_CODE, {
    message:
      'El formato del |código de clase| no es válido. Ejemplo: HIS-01-2024.',
  })
  classCode!: string;

  // 🔹 FECHA DE INSCRIPCIÓN (opcional → default hoy)
  @IsOptional()
  @StrictISODate({ fieldName: 'Fecha de inscripción', optional: true })
  enrollmentDate?: Date;
}
