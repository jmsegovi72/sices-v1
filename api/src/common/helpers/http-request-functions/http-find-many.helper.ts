import { NotFoundException } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from 'src/common/constants';
import { prismaErrorHandleCatch } from '@/common';
import { qwikMessageResponse, resolvePagination } from '@/common/helpers';
import { ApiResponse } from '@/common/interfaces';

export interface HttpRequestFindManyParams {
  serviceName: string;

  model: any;

  logger: PinoLogger;

  queryOptions: any;

  dto?: {
    limit?: number;
    page?: number;

    [key: string]: any;
  };

  // 🚩 Si true → lanza 404 cuando no hay resultados
  throwIfNotFound?: boolean;
}

export const httpRequestFindMany = async <T>({
  serviceName,
  model,
  logger,
  queryOptions,
  dto,
  throwIfNotFound = false,
}: HttpRequestFindManyParams): Promise<ApiResponse<T[]>> => {
  let results: T[] = [];

  let total = 0;

  // 🔹 Resolver paginación segura
  const pagination = resolvePagination(dto);

  try {
    // 🔹 Ejecutar consulta y conteo en paralelo
    const [dbResults, dbCount] = await Promise.all([
      model.findMany(queryOptions),

      model.count({
        where: queryOptions?.where || {},
      }),
    ]);

    results = dbResults;

    total = dbCount;
  } catch (error) {
    return prismaErrorHandleCatch(serviceName, 'findMany', logger, dto, error);
  }

  // 🔹 Caso: no encontrado
  if (results.length === 0 && throwIfNotFound) {
    const activeFilters: Record<string, any> = {};

    if (dto) {
      for (const [key, value] of Object.entries(dto)) {
        if (value !== undefined && value !== null && value !== '') {
          activeFilters[key] = value;
        }
      }
    }

    throw new NotFoundException(
      qwikMessageResponse({
        success: false,

        message: APP_MESSAGES.error.DB.NOT_FOUND,

        errorCode: 'NOT_FOUND',

        errorDetails:
          Object.keys(activeFilters).length > 0
            ? 'No se encontraron registros con los filtros aplicados'
            : undefined,
      }),
    );
  }

  // 🔹 Meta
  const records = results.length;

  const meta = {
    totalRecords: total,

    records,

    ...(pagination.hasPagination && {
      page: pagination.page,

      limit: pagination.limit,

      totalPages: total > 0 ? Math.ceil(total / pagination.limit) : 0,
    }),
  };

  // 🔹 Respuesta
  return qwikMessageResponse({
    success: true,

    message:
      results.length > 0
        ? APP_MESSAGES.success.DB.FIND_ALL
        : APP_MESSAGES.error.DB.NOT_FOUND,

    data: results,

    meta,
  });
};
