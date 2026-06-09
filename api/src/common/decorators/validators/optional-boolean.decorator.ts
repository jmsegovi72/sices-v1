// src/common/decorators/optional-boolean.decorator.ts

import { applyDecorators, BadRequestException } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';

interface OptionalBooleanOptions {
  fieldName: string;
}

export const OptionalBoolean = ({ fieldName }: OptionalBooleanOptions) =>
  applyDecorators(
    IsOptional(),
    IsBoolean({
      message: `El campo |${fieldName}| debe ser verdadero o falso.`,
    }),
  );

/**
 * 🔹 Query boolean:
 * true | false
 *
 * Convierte strings HTTP a [1, 0].
 */
export const OptionalBooleanString = ({ fieldName }: OptionalBooleanOptions) =>
  applyDecorators(
    IsOptional(),
    Type(() => String), // ← forzar que llegue como string al Transform
    Transform(({ value }) => {
      if (value === undefined || value === null) return undefined;
      const normalized = String(value).toLowerCase().trim();
      if (normalized === 'true' || normalized === '1') return true;
      if (normalized === 'false' || normalized === '0') return false;
      return 'INVALID';
    }),
    IsIn([true, false], {
      message: `El campo |${fieldName}| debe ser 'true' o 'false'.`,
    }),
  );
