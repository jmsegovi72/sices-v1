/**
 * @description
 * Formatea una cadena de plantilla, reemplazando cada instancia de '%s'
 * con los valores proporcionados en orden.
 * * @param template La cadena con uno o más marcadores '%s'.
 * @param args Los valores (string o number) que reemplazarán a los marcadores.
 */
export const formatString = (
  template: string,
  ...args: (string | number)[]
): string => {
  let index = 0;
  return template.replace(/%s/g, () => {
    const replacement = args[index++];
    return replacement !== undefined ? String(replacement) : '%s';
  });
};

/**
 * Verifica si un número es par (even).
 */
export const isEven = (numero: number): boolean => numero % 2 === 0;

export interface CurpData {
  gender: 'H' | 'M';
  birthDate: Date;
  nationality: 'M' | 'NE';
  stateCode: string;
}

/* ============================================================
 🔍 extractDataFromCURP()
 ------------------------------------------------------------
 📌 Descripción:
 Extrae información básica desde una CURP válida.

 🧠 Datos obtenidos:
 - Género (posición 10)
 - Fecha de nacimiento (posiciones 4-10)
 - Nacionalidad ('NE' → extranjero, otro → mexicano)
 - Código de entidad federativa

 ⚠️ Consideraciones:
 - Se asume que la CURP ya fue validada en el DTO.
 - Esta función valida únicamente la coherencia de la fecha.
 - Puede lanzar error si la fecha es inválida.

 🧾 Retorna:
 - CurpData: { gender, birthDate, nationality, stateCode }
============================================================ */
export const extractDataFromCURP = (curp: string): CurpData => {
  // 🔹 Género (posición 10)
  const gender = curp.charAt(10) as 'H' | 'M';

  // 🔹 Fecha (YYMMDD → se calcula siglo dinámicamente)
  const year = curp.substring(4, 6);
  const month = curp.substring(6, 8);
  const day = curp.substring(8, 10);

  const currentYear = new Date().getFullYear() % 100;
  const fullYear = Number(year) <= currentYear ? `20${year}` : `19${year}`;

  const birthDate = new Date(`${fullYear}-${month}-${day}`);

  // 🔴 Validación mínima: fecha válida
  if (isNaN(birthDate.getTime())) {
    throw new Error('La CURP contiene una fecha inválida.');
  }

  // 🔹 Entidad federativa (posiciones 11-12)
  const stateCode = curp.substring(11, 13);

  // 🔹 Nacionalidad derivada del código de entidad
  const nationality: 'M' | 'NE' = stateCode === 'NE' ? 'NE' : 'M';

  return {
    gender,
    birthDate,
    nationality,
    stateCode,
  };
};
