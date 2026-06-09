import { Matches } from 'class-validator';
import { REGEX } from '@/common/helpers';

/**
 * 🔹 TELÉFONO
 */
export function IsPhoneMX(fieldName = 'Teléfono') {
  return Matches(REGEX.PHONE, {
    message: `El |${fieldName}| debe tener 10 dígitos.`,
  });
}

/**
 * 🔹 FOLIO
 */
export function IsFolio(fieldName = 'Folio') {
  return Matches(
    new RegExp(`${REGEX.FOLIO.TYPE1.source}|${REGEX.FOLIO.TYPE2.source}`),
    {
      message: `El |${fieldName}| no es válido.`,
    },
  );
}
