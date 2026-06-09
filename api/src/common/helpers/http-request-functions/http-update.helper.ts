import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
import { ApiResponse } from '@/common/interfaces';
import { prismaErrorHandleCatch } from '@/common/prisma';
import { qwikMessageResponse } from '../response-messages.helper';

/* ============================================================
   📋 Interfaces
   ============================================================ */

export interface HttpRequestUpdateParams<T> {
  serviceName: string;
  model: any;
  logger: PinoLogger;
  idValue: number | string;
  data: T;

  // Opcionales
  returnData?: boolean;
  idFieldName?: string; // default: 'id'
}

export interface UpdateEntityParams<T> {
  idValue: number | string;
  data: T;
  client?: any;
  returnData?: boolean;
  idFieldName?: string;
}

/* ============================================================
   🔄 Método genérico UPDATE
   ============================================================ */

/**
 * 📌 Qué hace:
 * - Ejecuta actualización en Prisma
 * - Maneja errores centralizados
 * - Devuelve respuesta estandarizada
 */
export const httpRequestUpdate = async <
  T extends Record<string, any>,
  R = void,
>({
  serviceName,
  model,
  logger,
  idValue,
  data,
  returnData = false,
  idFieldName = 'id',
}: HttpRequestUpdateParams<T>): Promise<ApiResponse<R>> => {
  let result: R | undefined;

  try {
    // 🔹 1. Ejecutar actualización
    result = await model.update({
      where: { [idFieldName]: idValue },
      data,
    });
  } catch (error) {
    // 🚨 Manejo centralizado (lanza excepción)
    prismaErrorHandleCatch(serviceName, 'update', logger, data, error);
    throw error; // fallback (TS safety)
  }

  // 🔹 2. Respuesta con datos (opcional)
  if (returnData && result != null) {
    return qwikMessageResponse<R>({
      success: true,
      message: APP_MESSAGES.success.DB.UPDATE,
      data: result as R,
    });
  }

  // 🔹 3. Respuesta simple
  return qwikMessageResponse({
    success: true,
    message: APP_MESSAGES.success.DB.UPDATE,
  });
};
