import { NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
import { SearchDto } from '@/common/dtos';
import { ApiResponse } from '@/common/interfaces';
import { prismaErrorHandleCatch } from '@/common/prisma';
import { qwikMessageResponse } from '../response-messages.helper';

/* ============================================================
 🔍 method: httpRequestFindFirst
============================================================ */

export interface HttpRequestFindFirstParams {
  /** Nombre del servicio que invoca la operación (para trazabilidad en logs). */
  serviceName: string;

  /** Delegado del modelo de Prisma (ej: `this.prisma.student`). */
  model: any;

  /** Instancia de PinoLogger para registrar errores internos. */
  logger: PinoLogger;

  /** DTO original de búsqueda. Se usa como contexto para depurar errores 500. */
  searchDto?: SearchDto;

  /** Argumentos de Prisma (ej: `{ where: { status: 'ACTIVE' } }`). */
  queryOptions: any;

  // 👇 Nombres Semánticos
  /** Nombre del campo por el que se buscó (ej: 'curp'). Usa  do para el error 404. */
  searchField?: string;

  /** Valor que se intentó buscar. Usado para el error 404. */
  searchValue?: unknown;
  throwIfNotFound?: boolean;
}
export const httpRequestFindFirst = async <T>({
  serviceName,
  model,
  logger,
  queryOptions,
  searchDto,
  searchField,
  searchValue,
  throwIfNotFound = false,
}: HttpRequestFindFirstParams): Promise<ApiResponse<T | null>> => {
  let result: T | null = null;

  try {
    // 🔹 1. Ejecutar búsqueda en base de datos
    result = await model.findFirst(queryOptions);
  } catch (error) {
    // 🚨 Error real de base de datos (500)
    return prismaErrorHandleCatch(
      serviceName,
      'findFirst',
      logger,
      searchDto,
      error,
    );
  }

  // 🔹 2. Caso: no encontrado (404 opcional)
  if (!result && throwIfNotFound) {
    throw new NotFoundException(
      qwikMessageResponse({
        success: false,
        message: APP_MESSAGES.error.DB.NOT_FOUND,
        errorCode: 'NOT_FOUND',
        invalidField: searchField,
        providedValue: searchValue,
      }),
    );
  }

  // 🔹 3. Respuesta exitosa (aunque data sea null)
  return qwikMessageResponse({
    success: true,
    message: result
      ? APP_MESSAGES.success.DB.FIND
      : APP_MESSAGES.error.DB.NOT_FOUND,
    data: result,
  });
};
