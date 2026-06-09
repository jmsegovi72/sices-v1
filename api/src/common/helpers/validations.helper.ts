/**
 * 📦 Expresiones regulares centralizadas
 */
export const REGEX = {
  CURP: /^[A-Z]{4}\d{6}[HM][A-Z]{5}[A-Z0-9]\d$/,
  EMAIL: /^[\w.-]+@[a-zA-Z\d.-]+\.[a-zA-Z]{2,}$/,
  PASSWORD:
    /^(?=.*[A-ZÁÉÍÓÚÜÑ])(?=.*[a-záéíóúüñ])(?=.*\d)(?=.*[!@#$%&*_\-+=?.])[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\d!@#$%&*_\-+=?.]{8,12}$/,
  PHONE: /^\d{10}$/,
  NOT_ONLY_WHITESPACE: /^(?!\s*$).+/,
  DATE_ISO_8601: /^\d{4}-\d{2}-\d{2}$/,
  FOLIO: {
    TYPE1: /^[CD]-[A-Z0-9]{4}-\d{4}$/,
    TYPE2: /^[CD]-\d{5}-\d{6}-[A-Z0-9]{4}-\d{3}$/,
  },
  RFC: /^[A-ZÑ&]{4}\d{6}[A-Z0-9]{3}$/,
  CLASS_CODE: /^[A-Z]{3}-\d{2}-\d{4}$/,
  STUDENT_CODE: /^(\d{2})(0[1-9]|[12]\d|3[0-2])(\d{4})(\d{4})?$/,
  MYSQL_DATE: /^\d{4}-\d{2}-\d{2}$/,
  CCT: /^\d{2}[DEK][A-Z]{2}\d{4}[A-Z]$/,
} as const;

/**
 * 🧪 Validador genérico por regex
 */
export const matchRegex = (value: string, regex: RegExp): boolean => {
  if (typeof value !== 'string') return false;
  return regex.test(value.trim());
};

/**
 * 🔹 Validaciones específicas
 */

export const isValidIntegerId = (value: string): boolean =>
  matchRegex(value, /^\d+$/) && Number.isInteger(Number(value));

export const isValidCurp = (curp: string): boolean =>
  matchRegex(curp, REGEX.CURP);

export const isValidEmail = (email: string): boolean =>
  matchRegex(email, REGEX.EMAIL);

export const isValidCct = (cct: string): boolean => matchRegex(cct, REGEX.CCT);

export const isValidFolio = (folio: string): boolean =>
  matchRegex(folio, REGEX.FOLIO.TYPE1) || matchRegex(folio, REGEX.FOLIO.TYPE2);

export const isValidClassCode = (value: string): boolean =>
  matchRegex(value, REGEX.CLASS_CODE);

export const isValidStudentCode = (value: string): boolean =>
  matchRegex(value, REGEX.STUDENT_CODE);

/**
 * Ej: "ENERO 2024 - JUNIO 2024"
 */
export const isValidSemiannualPeriod = (value: string): boolean => {
  const months =
    'ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE';

  const regex = new RegExp(`^(${months}) \\d{4} - (${months}) \\d{4}$`);

  return matchRegex(value, regex);
};
