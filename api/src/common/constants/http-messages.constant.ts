import { HttpStatus } from '@nestjs/common';
/**
 * 🌐 MAPA DE ERRORES HTTP
 *
 * Qué hace:
 * - Centraliza códigos HTTP y su significado
 * - Evita hardcodear números (404, 400, etc.)
 *
 * Uso:
 * - Se utiliza para asignar automáticamente statusCode en errores
 *
 * Ejemplo:
 * HTTP_ERRORS.NOT_FOUND.code → 404
 *
 * Nota:
 * - El "label" es solo informativo (no se usa en ApiResponse)
 * - El campo importante es "code"
 */
export const HTTP_ERRORS = {
  BAD_REQUEST: {
    code: HttpStatus.BAD_REQUEST,
    label: 'Bad Request',
  },
  UNAUTHORIZED: {
    code: HttpStatus.UNAUTHORIZED,
    label: 'Unauthorized',
  },
  FORBIDDEN: {
    code: HttpStatus.FORBIDDEN,
    label: 'Forbidden',
  },
  NOT_FOUND: {
    code: HttpStatus.NOT_FOUND,
    label: 'Not Found',
  },
  CONFLICT: {
    code: HttpStatus.CONFLICT,
    label: 'Conflict',
  },
  INTERNAL: {
    code: HttpStatus.INTERNAL_SERVER_ERROR,
    label: 'Internal Server Error',
  },
} as const;

/**
 * 🔧 Devuelve metadata HTTP compatible con ApiResponse
 */
export const getHttpErrorMeta = (key: keyof typeof HTTP_ERRORS) => {
  return {
    statusCode: HTTP_ERRORS[key].code,
    error: {
      code: key,
    },
  };
};
