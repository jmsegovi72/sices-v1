import { format, parseISO } from 'date-fns';
import * as generator from 'generate-password';

export const formatDate = (isoDate: string | Date): string => {
  try {
    let isoDateString: string;
    if (isoDate instanceof Date) {
      isoDateString = isoDate.toISOString().split('T')[0]; // Tomar solo la parte de la fecha ISO
    } else {
      isoDateString = isoDate.split('T')[0]; // Tomar solo la parte de la fecha si ya es string ISO
    }
    const date = parseISO(isoDateString);

    const formatDate = format(date, 'yyyy-MM-dd');

    return formatDate;
  } catch (error) {
    console.error('Error al formatear la fecha:', error);
    return '';
  }
};

/**
 * 🔐 Generador de contraseñas temporales que cumple con el RegEx institucional restringido:
 * /^(?=.*[A-ZÁÉÍÓÚÜÑ])(?=.*[a-záéíóúüñ])(?=.*\d)(?=.*[!@#$%&*_\-+=?.])[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\d!@#$%&*_\-+=?.]{8,12}$/
 */
export const generateStrictTempPassword = (): string => {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%&*_-+=?.'; // Safe special characters

  const getRand = (str: string) => str.charAt(Math.floor(Math.random() * str.length));

  // Asegurar al menos uno de cada tipo de caracter requerido
  const passwordArr = [
    getRand(uppercase),
    getRand(lowercase),
    getRand(numbers),
    getRand(symbols),
  ];

  // Rellenar hasta completar 10 caracteres
  const allPool = uppercase + lowercase + numbers + symbols;
  for (let i = 4; i < 10; i++) {
    passwordArr.push(getRand(allPool));
  }

  // Mezclar el arreglo (Fisher-Yates shuffle)
  for (let i = passwordArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = passwordArr[i];
    passwordArr[i] = passwordArr[j];
    passwordArr[j] = temp;
  }

  return passwordArr.join('');
};
