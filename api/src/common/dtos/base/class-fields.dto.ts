// src/common/dtos/class-fields.dto.ts
import { IsIn, Matches } from 'class-validator';
import { RequiredNonEmptyString } from '@/common/decorators';
import { REGEX } from '@/common/helpers';

export const SHIFTS = ['Matutino', 'Vespertino', 'Mixto'] as const;
export const GROUPS = ['A', 'B', 'C', 'Único'] as const;
export const SEMIANNUAL_PERIODS = [
  'AGOSTO - ENERO',
  'FEBRERO - JULIO',
  'DICIEMBRE - MAYO',
  'MAYO - NOVIEMBRE',
] as const;

export class ClassFieldsDto {
  // 🔹 Código de clase
  @Matches(REGEX.CLASS_CODE, {
    message:
      'El formato del |código de clase| no es válido. Ejemplo: HIS-01-2024.',
  })
  classCode!: string;

  // 🔹 Grupo
  @IsIn(GROUPS, {
    message: 'El campo |group| debe ser: A, B, C o Único.',
  })
  group!: string;

  // 🔹 Turno
  @IsIn(SHIFTS, {
    message: 'El campo |shift| debe ser: Matutino, Vespertino o Mixto.',
  })
  shift!: string;

  // 🔹 Materia electiva
  @RequiredNonEmptyString({ fieldName: 'Materia electiva', max: 125 })
  elective!: string;

  // 🔹 Ciclo escolar
  @RequiredNonEmptyString({ fieldName: 'Ciclo escolar', max: 9 })
  schoolYear!: string;

  // 🔹 Periodo semestral
  @IsIn(SEMIANNUAL_PERIODS, {
    message: 'El periodo semestral no es válido.',
  })
  semiannualPeriod!: string;
}
