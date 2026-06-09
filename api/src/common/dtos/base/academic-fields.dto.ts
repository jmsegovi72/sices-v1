// src/common/dtos/academic-fields.dto.ts
import { IsIn, Matches } from 'class-validator';
import {
  OptionalPositiveInt,
  RequiredNonEmptyString,
} from '@/common/decorators';
import { REGEX } from '@/common/helpers/validations.helper';

export const ACADEMIC_DISCIPLINES = [
  'Biología',
  'Español',
  'Física',
  'Formación Ética y Ciudadana',
  'Geografía',
  'Historia',
  'Inglés',
  'Matemáticas',
  'Química',
  'Posgrado',
  'TC',
  'Telesecundaria',
  'NA',
] as const;

export const EDUCATION_LEVELS = [
  'Doctorado',
  'Licenciatura universitaria',
  'Maestría',
  'Menor a licenciatura',
  'Normal básica',
  'Normal plan 84 o superior',
  'Otro',
  'Licenciatura',
  'No Aplica',
] as const;

export const MODALITIES = [
  'Escolarizada',
  'Mixta',
  'No escolarizada',
  'Virtual',
  'Abierta',
  'Semipresencial',
  'Dual',
] as const;

export class AcademicFieldsDto {
  // 🔹 Disciplina académica
  @IsIn(ACADEMIC_DISCIPLINES, {
    message:
      'El campo |academicDiscipline| debe ser uno de los valores permitidos.',
  })
  academicDiscipline!: string;

  // 🔹 Nivel educativo
  @IsIn(EDUCATION_LEVELS, {
    message:
      'El campo |educationLevel| debe ser uno de los valores permitidos.',
  })
  educationLevel!: string;

  // 🔹 Modalidad
  @IsIn(MODALITIES, {
    message: 'El campo |modality| debe ser uno de los valores permitidos.',
  })
  modality!: string;

  // 🔹 Plan de estudios
  @RequiredNonEmptyString({ fieldName: 'Plan de estudios', max: 4 })
  studyPlan!: string;

  // 🔹 Matrícula
  @Matches(REGEX.STUDENT_CODE, {
    message:
      'El valor de |matrícula| debe tener el formato válido. Ejemplo: 24041234.',
  })
  codeNumber!: string;

  // 🔹 Programa educativo
  @RequiredNonEmptyString({ fieldName: 'Programa educativo', max: 125 })
  educationalProgram!: string;

  // 🔹 Código del programa
  @RequiredNonEmptyString({ fieldName: 'Código del programa', max: 6 })
  programCode!: string;

  @OptionalPositiveInt({ fieldName: 'Semestre', min: 1, max: 8 })
  semester?: number;
}
