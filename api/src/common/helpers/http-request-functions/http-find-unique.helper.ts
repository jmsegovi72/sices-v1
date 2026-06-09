/* ============================================================
 🔍 method: httpRequestFindUnique
============================================================ */
import { NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from 'src/common/constants';
import { SearchDto } from 'src/common/dtos';
import { prismaErrorHandleCatch } from '@/common';
import { qwikMessageResponse } from '@/common/helpers';
import { ApiResponse } from '@/common/interfaces';

export interface HttpRequestFindUniqueParams {
  /** Nombre del servicio que invoca la operación (para trazabilidad en logs). */
  serviceName: string;
  /** Delegado del modelo de Prisma (ej: `this.prisma.student`). */
  model: any;
  /** Instancia de PinoLogger para registrar errores internos. */
  logger: PinoLogger;
  /** DTO original de búsqueda. Se usa como contexto para depurar errores 500. */
  searchDto?: SearchDto;
  /**
   * Argumentos de Prisma.
   * ⚠️ IMPORTANTE: El `where` debe contener SOLO campos únicos o IDs.
   */
  queryOptions: any;
  /** Nombre del campo por el que se buscó (ej: 'id'). Usado para el error 404. */
  searchField?: string;
  /** Valor que se intentó buscar. Usado para el error 404. */
  searchValue?: unknown;
  throwIfNotFound?: boolean;
}

export const httpRequestFindUnique = async <T>({
  serviceName,
  model,
  logger,
  searchDto,
  queryOptions,
  searchField,
  searchValue,
  throwIfNotFound = false,
}: HttpRequestFindUniqueParams): Promise<ApiResponse<T | null>> => {
  let result: T | null = null;

  try {
    // 🔹 1. Ejecutar búsqueda en base de datos
    result = await model.findUnique(queryOptions);
  } catch (error) {
    // 🚨 Error real de base de datos (500)
    return prismaErrorHandleCatch(
      serviceName,
      'findUnique',
      logger,
      searchDto, // ← contexto del error igual que findFirst
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
