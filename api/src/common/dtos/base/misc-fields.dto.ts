// src/common/dtos/misc-fields.dto.ts
import { IsDecimal, IsIn, IsOptional, Matches } from 'class-validator';
import { RequiredNonEmptyString } from '@/common/decorators';
import { REGEX } from '@/common/helpers';

export const FUNDING_SOURCES = [
  'Pública',
  'Privada',
  'No especificado',
] as const;

export const GRADE_TYPES = ['CS', 'RE'] as const;
export const GRADE_TEMPORALITIES = ['FINAL', 'TEMPORAL'] as const;

export class MiscFieldsDto {
  // 🔹 Promedio
  @IsDecimal(
    { decimal_digits: '0,2' },
    {
      message:
        'El campo |promedio| debe ser un número decimal con máximo 2 decimales.',
    },
  )
  average!: string;

  // 🔹 CCT
  @Matches(REGEX.CCT, {
    message: 'El formato de la CCT no es válido. Ejemplo: 09DPR3181Z.',
  })
  cct!: string;

  // 🔹 Origen de recursos
  @IsOptional()
  @IsIn(FUNDING_SOURCES, {
    message:
      'El origen de los recursos debe ser: Pública, Privada o No especificado.',
  })
  fundingSource?: string;

  // 🔹 Número de lista
  @RequiredNonEmptyString({ fieldName: 'Número de lista', max: 3 })
  listNumber!: string;

  // 🔹 Tipo de calificación
  @IsOptional()
  @IsIn(GRADE_TYPES, {
    message: 'El |tipo| debe ser CS o RE.',
  })
  type?: string;

  // 🔹 Temporalidad de calificación
  @IsOptional()
  @IsIn(GRADE_TEMPORALITIES, {
    message: 'La |temporalidad| debe ser FINAL o TEMPORAL.',
  })
  temporality?: string;
}
