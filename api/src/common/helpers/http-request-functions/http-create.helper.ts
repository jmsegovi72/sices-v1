/**
 * 📦 Método genérico para crear registros
 *
 * Qué hace:
 * - Ejecuta un create en Prisma
 * - Devuelve una respuesta estandarizada
 * - Maneja errores usando PrismaErrorHandler
 */

import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
import { qwikMessageResponse } from '@/common/helpers';
import { ApiResponse } from '@/common/interfaces';
import { prismaErrorHandleCatch } from '@/common/prisma';

export interface HttpRequestCreateParams<T> {
  serviceName: string;
  methodName?: string;

  // Modelo de Prisma
  model: { create: (args: { data: T }) => Promise<any> };

  logger: PinoLogger;
  data: T;

  // Opcional: devolver el registro creado
  returnData?: boolean;
}

export const httpRequestCreate = async <
  T extends Record<string, any>,
  R = any,
>({
  serviceName,
  methodName = 'create',
  model,
  logger,
  data,
  returnData = false,
}: HttpRequestCreateParams<T>): Promise<ApiResponse<R>> => {
  try {
    // 🔹 1. Crear registro
    const result = await model.create({ data });

    // 🔹 2. Respuesta exitosa
    return qwikMessageResponse<R>({
      success: true,
      message: APP_MESSAGES.success.DB.CREATE,
      ...(returnData && { data: result as R }),
    });
  } catch (error) {
    // 🚨 Manejo centralizado de errores Prisma
    prismaErrorHandleCatch(serviceName, methodName, logger, data, error);

    // Nunca llega aquí (el handler lanza excepción)
    throw error;
  }
};
