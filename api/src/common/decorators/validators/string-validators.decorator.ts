import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export interface StringOptions {
  fieldName: string;
  min?: number;
  max?: number;
}

/**
 * 🔹 STRING OPCIONAL
 */
export function OptionalNonEmptyString(options: StringOptions) {
  const { fieldName, min, max } = options;

  const decorators = [
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    ),
    IsOptional(),
    IsString({ message: `El valor de |${fieldName}| debe ser texto.` }),
    Matches(/\S/, {
      message: `El valor de |${fieldName}| no puede ser solo espacios.`,
    }),
  ];

  if (min !== undefined || max !== undefined) {
    decorators.push(
      Length(min ?? 0, max ?? Number.MAX_SAFE_INTEGER, {
        message: `El valor de |${fieldName}| tiene longitud inválida.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}

/**
 * 🔹 STRING REQUERIDO
 */
export function RequiredNonEmptyString(options: StringOptions) {
  const { fieldName, min, max } = options;

  const decorators = [
    Transform(({ value }) =>
      typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
    ),
    IsNotEmpty({ message: `El campo |${fieldName}| es obligatorio.` }),
    IsString({ message: `El campo |${fieldName}| debe ser texto.` }),
    Matches(/\S/, {
      message: `El campo |${fieldName}| no puede ser solo espacios.`,
    }),
  ];

  if (min !== undefined || max !== undefined) {
    decorators.push(
      Length(min ?? 0, max ?? Number.MAX_SAFE_INTEGER, {
        message: `El campo |${fieldName}| tiene longitud inválida.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}
