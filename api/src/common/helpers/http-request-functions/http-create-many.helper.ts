/**
 * 📦 Método genérico para creación masiva de registros
 *
 * Qué hace:
 * - Ejecuta un createMany en Prisma
 * - Devuelve una respuesta estandarizada
 * - Maneja errores usando PrismaErrorHandler
 *
 * ⚠️ Notas:
 * - No retorna los registros creados (limitación de Prisma)
 * - Retorna únicamente el número de registros insertados
 */

import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
import { qwikMessageResponse } from '@/common/helpers';
import { ApiResponse } from '@/common/interfaces';
import { prismaErrorHandleCatch } from '@/common/prisma';

export interface HttpRequestCreateManyParams<T> {
  serviceName: string;
  methodName?: string;

  // Modelo Prisma
  model: { createMany: (args: { data: T[] }) => Promise<{ count: number }> };

  logger: PinoLogger;
  data: T[];
}

export const httpRequestCreateMany = async <T extends Record<string, any>>({
  serviceName,
  methodName = 'createMany',
  model,
  logger,
  data,
}: HttpRequestCreateManyParams<T>): Promise<ApiResponse<void>> => {
  try {
    // 🔹 1. Inserción masiva
    const result = await model.createMany({ data });

    const createdCount = result.count;

    // 🔹 2. Respuesta exitosa (alineada con create)
    return qwikMessageResponse({
      success: true,
      message: APP_MESSAGES.success.DB.CREATE_BATCH,
      meta: {
        totalRecords: createdCount,
      },
    });
  } catch (error) {
    // 🚨 Manejo centralizado de errores Prisma
    prismaErrorHandleCatch(serviceName, methodName, logger, data, error);

    // Nunca llega aquí
    throw error;
  }
};
