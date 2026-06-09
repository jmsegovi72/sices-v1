import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsDate, IsOptional } from 'class-validator';

/**
 * Opciones para StrictISODate
 */
export interface StrictISODateOptions {
  fieldName: string;
  optional?: boolean;
}

/**
 * Valida una fecha estricta en formato ISO (yyyy-mm-dd):
 * - No lanza excepciones manuales
 * - Usa validación estándar de class-validator
 * - Convierte a Date si es válida
 */
export function StrictISODate(options: StrictISODateOptions) {
  const { fieldName, optional } = options;

  const decorators = [
    // 🔄 Transformación segura con validación de formato integrada
    Transform(({ value }) => {
      if (typeof value === 'string' && value.trim() !== '') {
        // Expresión regular para verificar formato exacto yyyy-mm-dd
        const regex = /^\d{4}-\d{2}-\d{2}$/;
        if (!regex.test(value)) {
          return 'INVALID_FORMAT'; // Retorna string para que IsDate falle
        }
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'INVALID_DATE'; // Retorna string para que IsDate falle
        }
        return date;
      }
      return value;
    }),

    // 🔹 Validación tipo Date
    IsDate({
      message: `El valor de |${fieldName}| debe ser una fecha válida en formato yyyy-mm-dd.`,
    }),
  ];

  if (optional) {
    decorators.unshift(IsOptional()); // 👈 primero optional
  }

  return applyDecorators(...decorators);
}
