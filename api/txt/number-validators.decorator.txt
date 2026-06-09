import { applyDecorators } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  Max,
  Min,
} from 'class-validator';

/**
 * 📦 Opciones base para validadores numéricos
 */
export interface NumberOptions {
  fieldName: string;
  min?: number;
  max?: number;
}

/* ============================================================
   🔹 ENTERO POSITIVO OPCIONAL (≥ 1)
============================================================ */
export function OptionalPositiveInt(options: NumberOptions) {
  const { fieldName, min, max } = options;

  const decorators = [
    IsOptional(),

    Transform(({ value }) => {
      if (value === undefined || value === null || value === '') return value;

      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? value : parsed;
    }),

    IsInt({
      message: `El campo |${fieldName}| debe ser un número entero.`,
    }),

    IsPositive({
      message: `El campo |${fieldName}| debe ser un número positivo.`,
    }),
  ];

  if (typeof min === 'number') {
    decorators.push(
      Min(min, {
        message: `El campo |${fieldName}| debe ser mayor o igual a ${min}.`,
      }),
    );
  }

  if (typeof max === 'number') {
    decorators.push(
      Max(max, {
        message: `El campo |${fieldName}| debe ser menor o igual a ${max}.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}

/* ============================================================
   🔹 ENTERO POSITIVO REQUERIDO (≥ 1)
============================================================ */
export function RequiredPositiveInt(options: NumberOptions) {
  const { fieldName, min, max } = options;

  const decorators = [
    IsNotEmpty({
      message: `El campo |${fieldName}| es obligatorio.`,
    }),

    Type(() => Number),

    IsInt({
      message: `El campo |${fieldName}| debe ser un número entero.`,
    }),

    IsPositive({
      message: `El campo |${fieldName}| debe ser un número positivo.`,
    }),
  ];

  const actualMin = typeof min === 'number' ? min : 1;

  decorators.push(
    Min(actualMin, {
      message: `El campo |${fieldName}| debe ser mayor o igual a ${actualMin}.`,
    }),
  );

  if (typeof max === 'number') {
    decorators.push(
      Max(max, {
        message: `El campo |${fieldName}| debe ser menor o igual a ${max}.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}

/* ============================================================
   🔹 ENTERO NO NEGATIVO OPCIONAL (≥ 0)
============================================================ */
export function OptionalNonNegativeInt(options: NumberOptions) {
  const { fieldName, min, max } = options;

  const decorators = [
    IsOptional(),

    Transform(({ value }) => {
      if (value === undefined || value === null || value === '') return value;

      const parsed = parseInt(value, 10);
      return isNaN(parsed) ? value : parsed;
    }),

    IsInt({
      message: `El campo |${fieldName}| debe ser un número entero.`,
    }),
  ];

  const actualMin = typeof min === 'number' ? min : 0;

  decorators.push(
    Min(actualMin, {
      message: `El campo |${fieldName}| debe ser mayor o igual a ${actualMin}.`,
    }),
  );

  if (typeof max === 'number') {
    decorators.push(
      Max(max, {
        message: `El campo |${fieldName}| debe ser menor o igual a ${max}.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}

/* ============================================================
   🔹 ENTERO NO NEGATIVO REQUERIDO (≥ 0)
============================================================ */
export function RequiredNonNegativeInt(options: NumberOptions) {
  const { fieldName, min, max } = options;

  const decorators = [
    IsNotEmpty({
      message: `El campo |${fieldName}| es obligatorio.`,
    }),

    Type(() => Number),

    IsInt({
      message: `El campo |${fieldName}| debe ser un número entero.`,
    }),
  ];

  const actualMin = typeof min === 'number' ? min : 0;

  decorators.push(
    Min(actualMin, {
      message: `El campo |${fieldName}| debe ser mayor o igual a ${actualMin}.`,
    }),
  );

  if (typeof max === 'number') {
    decorators.push(
      Max(max, {
        message: `El campo |${fieldName}| debe ser menor o igual a ${max}.`,
      }),
    );
  }

  return applyDecorators(...decorators);
}
