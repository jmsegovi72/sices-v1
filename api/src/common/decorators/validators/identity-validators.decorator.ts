import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsOptional, Matches } from 'class-validator';
import { REGEX } from '@/common/helpers';

/**
 * 🔹 CURP
 */
export function IsCURP(fieldName = 'CURP') {
  return applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
    ),
    Matches(REGEX.CURP, {
      message: `El |${fieldName}| no tiene formato válido.`,
    }),
  );
}

/**
 * 🔹 PASSWORD
 */
export function IsStrongPassword(fieldName = 'Contraseña') {
  return applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim() : value,
    ),
    Matches(REGEX.PASSWORD, {
      message: `La |${fieldName}| no cumple con el formato requerido.`,
    }),
  );
}

/**
 * 🔹 RFC Persona Física (13 caracteres)
 * - Normaliza a mayúsculas
 * - Valida formato estándar
 */
export function IsRFC(fieldName = 'RFC') {
  return applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
    ),

    Matches(REGEX.RFC, {
      message: `El |${fieldName}| no tiene un formato válido.`,
    }),
  );
}

/**
 * 🔹 GÉNERO basado en CURP (solo H o M)
 */
/**
 * 🔹 GÉNERO flexible (H/M en cualquier combinación)
 */
export function IsGender(fieldName = 'Género') {
  return applyDecorators(
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().toUpperCase() : value,
    ),
    IsOptional(),
    Matches(/^(H|M)$/, {
      message: `El |${fieldName}| debe ser H o M.`,
    }),
  );
}
