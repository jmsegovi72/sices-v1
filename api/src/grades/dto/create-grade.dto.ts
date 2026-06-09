// create-grade.dto.ts
import { PickType } from '@nestjs/mapped-types';
import {
  OptionalNonNegativeInt,
  RequiredNonNegativeInt,
  RequiredPositiveInt,
} from '@/common/decorators';
import { MiscFieldsDto } from '@/common/dtos';

export { GRADE_TEMPORALITIES, GRADE_TYPES } from '@/common/dtos';

export class CreateGradeDto extends PickType(MiscFieldsDto, [
  'type',
  'temporality',
] as const) {
  // 🔹 Inscripción
  @RequiredPositiveInt({ fieldName: 'Inscripción' })
  enrollmentId!: number;

  // 🔹 Materia
  @RequiredPositiveInt({ fieldName: 'Materia' })
  subjectId!: number;

  // 🔹 Calificación (5-10)
  @RequiredNonNegativeInt({ fieldName: 'Calificación', min: 5, max: 10 })
  grade!: number;

  // 🔹 Oportunidad (default 0)
  @OptionalNonNegativeInt({ fieldName: 'Oportunidad', min: 0 })
  opportunity?: number;
}
