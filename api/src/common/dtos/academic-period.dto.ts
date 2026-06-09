// common/dtos/academic-period.dto.ts
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, Matches } from 'class-validator';
import { OptionalNonEmptyString, OptionalPositiveInt } from '../decorators';

// Definir los períodos válidos en una constante (fácil de mantener)
const VALID_SEMESTER_PERIODS = [
  'Febrero - Julio',
  'Agosto - Enero',
  'Mayo - Noviembre', // período extraordinario
  // otros períodos
] as const;

// Crear un mapa de normalización dinámico
const NORMALIZATION_MAP: Record<string, string> = {};
for (const period of VALID_SEMESTER_PERIODS) {
  // Normalizar: minúsculas y eliminar espacios alrededor del guión
  const normalizedKey = period.toLowerCase().replace(/\s*-\s*/g, '-');
  NORMALIZATION_MAP[normalizedKey] = period;
}

export class AcademicPeriodDto {
  @IsOptional()
  @OptionalNonEmptyString({
    fieldName: 'Periodo semestral',
    max: 20,
  })
  @Transform(({ value }) => {
    if (!value) return value;

    // Normalizar el valor recibido
    const normalized = value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/\s*-\s*/g, '-');

    // Buscar en el mapa dinámico
    if (NORMALIZATION_MAP[normalized]) {
      return NORMALIZATION_MAP[normalized];
    }

    return value;
  })
  @IsIn(VALID_SEMESTER_PERIODS as unknown as string[], {
    message: `El |período semestral| debe ser : ${VALID_SEMESTER_PERIODS.join(', ')}`,
  })
  semiannualPeriod?: string;

  @OptionalPositiveInt({
    fieldName: 'Semestre',
    min: 1,
    max: 8,
  })
  semester?: number;

  @IsOptional()
  @Matches(/^[0-9]{4}-[0-9]{4}$/, {
    message: 'El valor de |ciclo| debe tener el formato: 2024-2025',
  })
  schoolYear?: string;
}
