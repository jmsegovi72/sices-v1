import { APP_MESSAGES, HTTP_ERRORS } from '../constants';
import { ApiResponse } from '../interfaces';

interface QwikMessageParams<T = any> {
  success: boolean;

  // Mensaje
  message?: string;

  // Datos
  data?: T;
  token?: string;
  meta?: ApiResponse['meta'];

  // Error (nuevo modelo)
  errorCode?: keyof typeof HTTP_ERRORS;
  errorDetails?: string;
  invalidField?: string;
  providedValue?: any;
}

/**
 * 🚀 GENERADOR DE RESPUESTA ESTÁNDAR
 *
 * Qué hace:
 * - Construye una respuesta uniforme basada en la interfaz ApiResponse
 * - Centraliza éxito y error en un solo punto
 *
 * Uso:
 * - ✔ Respuestas exitosas
 * - ✔ Manejo de errores estructurados
 * - ✔ Integración con HTTP_ERRORS
 *
 * Reglas importantes:
 * - El mensaje SIEMPRE debe venir del servicio (APP_MESSAGES)
 * - El código HTTP se determina automáticamente si hay errorCode
 * - No hay lógica automática basada en "action" (evitamos magia)
 *
 * Estructura:
 * - success → indica éxito o fallo
 * - status → 'success' | 'error'
 * - statusCode → código HTTP
 * - message → mensaje para el usuario
 * - data → datos opcionales
 * - error → objeto estructurado (solo si success = false)
 *
 * Error:
 * - code → identificador técnico (NOT_FOUND, BAD_REQUEST, etc.)
 * - details → descripción técnica opcional
 * - invalidField → campo que falló (opcional)
 * - providedValue → valor enviado (opcional)
 *
 * Ejemplos:
 *
 * ✔ Éxito:
 * qwikMessageResponse({
 *   success: true,
 *   message: APP_MESSAGES.success.DB.CREATE,
 *   data: user,
 * });
 *
 * ✔ Error:
 * qwikMessageResponse({
 *   success: false,
 *   message: APP_MESSAGES.error.DB.NOT_FOUND,
 *   errorCode: 'NOT_FOUND',
 *   invalidField: 'id',
 *   providedValue: 10,
 * });
 *
 * Nota:
 * - Evitamos ACTION_SUCCESS_MAP para mantener control explícito
 */
export function qwikMessageResponse<T = any>(
  params: QwikMessageParams<T>,
): ApiResponse<T> {
  const {
    success,
    message,
    data,
    token,
    meta,
    errorCode,
    errorDetails,
    invalidField,
    providedValue,
  } = params;

  // 🔹 STATUS
  const status: ApiResponse['status'] = success ? 'success' : 'error';

  // 🔹 STATUS CODE
  let statusCode = 200;

  if (!success && errorCode) {
    statusCode = HTTP_ERRORS[errorCode].code;
  }

  // 🔹 MENSAJE
  const finalMessage =
    message ??
    (success ? APP_MESSAGES.success.GENERAL : APP_MESSAGES.error.GENERAL);

  // 🔹 ERROR STRUCT
  const error =
    !success && errorCode
      ? {
          code: errorCode,
          ...(errorDetails && { details: errorDetails }),
          ...(invalidField && { invalidField }),
          ...(providedValue && { providedValue }),
        }
      : undefined;

  return {
    success,
    status,
    statusCode,
    message: finalMessage,
    data,
    token,
    meta,
    ...(error && { error }),
  };
}

/**
 * 🛠️ RESPUESTA SIMPLE (WRAPPER)
 *
 * Qué hace:
 * - Simplifica la creación de respuestas básicas
 * - Internamente usa qwikMessageResponse
 *
 * Uso:
 * - ✔ Casos simples sin error estructurado
 * - ✔ Respuestas rápidas en controladores
 *
 * Ejemplo:
 *
 * messageResponse(true, 'Operación exitosa', data);
 *
 * Nota:
 * - No se recomienda para errores complejos
 * - Para errores usar directamente qwikMessageResponse
 */
export const messageResponse = <T = any>(
  success: boolean,
  message: string,
  data?: T,
): ApiResponse<T> => {
  return qwikMessageResponse({
    success,
    message,
    data,
  });
};
