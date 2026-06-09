// common/dtos/academic-fields.dto.ts
import { IsIn, IsOptional, Matches } from 'class-validator';
import { OptionalNonEmptyString } from '../decorators/validators';
import { REGEX } from '../helpers/validations.helper';
import {
  ACADEMIC_DISCIPLINES,
  EDUCATION_LEVELS,
  MODALITIES,
} from './base/academic-fields.dto';

/**
 * @deprecated
 * ⚠️ ARCHIVO DEPRECADO — PENDIENTE DE ELIMINAR
 * ------------------------------------------------------------
 */
export class QueryAcademicFieldsDto {
  @IsOptional()
  @IsIn(ACADEMIC_DISCIPLINES, {
    message: `El campo |academicDiscipline| debe ser uno de los valores permitidos.`,
  })
  academicDiscipline?: string;

  @IsOptional()
  @IsIn(EDUCATION_LEVELS, {
    message: `El campo |educationLevel| debe ser uno de los valores permitidos.`,
  })
  educationLevel?: string;

  @IsOptional()
  @IsIn(MODALITIES, {
    message: `El campo |modality| debe ser uno de los valores permitidos.`,
  })
  modality?: string;
  // 🔹 Plan de estudios (ej: 2018, 2022)
  @OptionalNonEmptyString({ fieldName: 'Plan de estudios', max: 4 })
  studyPlan?: string;

  @IsOptional()
  @Matches(REGEX.STUDENT_CODE, {
    message:
      'El valor de |matrícula| debe tener el formato: dos dígitos del año, seguido de "04", y de 4 a 8 dígitos adicionales. Ejemplo: 24041234.',
  })
  codeNumber?: string;

  /**
   * 🔹 Programa educativo
   */
  @OptionalNonEmptyString({
    fieldName: 'Programa educativo',
    max: 125,
  })
  educationalProgram?: string;

  /**
   * 🔹 Código del programa
   */
  @OptionalNonEmptyString({
    fieldName: 'Código del programa',
    max: 6,
  })
  programCode?: string;
}
