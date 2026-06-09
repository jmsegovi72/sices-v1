import { IntersectionType, PartialType, PickType } from '@nestjs/mapped-types';
import {
  OptionalBoolean,
  OptionalPositiveInt,
  RequiredPositiveInt,
} from '@/common/decorators';
import { ClassFieldsDto } from '@/common/dtos';

// create-class.dto.ts
export class CreateClassDto extends IntersectionType(
  // 🔹 ClassFieldsDto → group, shift, elective, classCode (todos opcionales)
  PartialType(
    PickType(ClassFieldsDto, ['group', 'shift', 'elective'] as const),
  ),
) {
  // 🔹 Exclusivos de Class
  @RequiredPositiveInt({ fieldName: 'Programa educativo' })
  educationalProgramId!: number;

  @RequiredPositiveInt({ fieldName: 'Ciclo escolar' })
  schoolYearId!: number;

  @RequiredPositiveInt({ fieldName: 'Semestre' })
  semesterId!: number;

  @OptionalBoolean({ fieldName: 'Periodo extraordinario' })
  isExtraordinaryPeriod?: boolean;

  // 🔹 Solo requerido si isExtraordinaryPeriod = true
  @OptionalPositiveInt({ fieldName: 'Periodo semestral' })
  semiannualPeriodId?: number;
}
