// src/common/helpers/database.helper.ts

import { BadRequestException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  CreateEntityParams,
  FindEntityParams,
  UpdateEntityParams,
} from '../interfaces';
import { TypeWhereFieldMap } from '../types';

/**
 * Agrupamos los helpers que comparten dependencias (Prisma)
 * y propósito (gestión de parámetros).
 */

export const extractCreateParams = <T>(
  params: CreateEntityParams<T>,
  prismaClient: PrismaClient,
) => {
  const { userId, dto, options } = params;
  const { returnData = false, tx } = options ?? {};
  const client = tx ?? prismaClient;

  return {
    userId,
    // 💡 Inyectamos createdBy para que el Create también sea automático
    data: {
      ...dto,
      createdBy: userId,
    },
    client,
    returnData,
  };
};

export function buildWherePlain<T extends string>(
  type: string,
  value: unknown,
  maps: Array<TypeWhereFieldMap>,
): Record<T, unknown> {
  const mapping = maps.find((m) => m.type === type);

  if (!mapping) {
    throw new BadRequestException(
      `El valor de búsqueda |${value}| no está permitido para esta consulta.`,
    );
  }

  const finalValue =
    mapping.field === 'id' || mapping.field.endsWith('Id')
      ? Number(value)
      : value;

  return { [mapping.field]: finalValue } as Record<T, unknown>;
}

export const extractUpdateParams = <T>(
  params: UpdateEntityParams<T>,
  prismaClient: PrismaClient,
) => {
  const { userId, id, dto, options } = params;
  const { returnData = false, tx, idFieldName = 'id' } = options ?? {};

  // Determinamos si usamos la instancia global o una transacción activa
  const client = tx ?? prismaClient;

  return {
    userId,
    idValue: id,
    // Inyectamos el userId del administrador para la auditoría de SICES V3
    data: {
      ...dto,
      updatedBy: userId, // Cambiamos 'userId' por 'updatedBy' para que coincida con la BD
    },
    client,
    returnData,
    idFieldName,
  };
};

/**
 * 🛠️ extractFindParams
 * ------------------------------------------------------------
 * 📌 Estandariza la extracción de parámetros para métodos de lectura (Find).
 * * @param params - Objeto tipo FindEntityParams que agrupa el DTO y opciones.
 * @param prismaClient - Instancia global de Prisma (this.prisma).
 * @returns Objeto con el DTO, el cliente activo (tx o global) y la regla de excepción.
 */
export const extractFindParams = <T>(
  params: FindEntityParams<T>,
  prismaClient: PrismaClient,
) => {
  const { searchDto, options } = params;

  // 🔹 Extraemos opciones con valores por defecto
  const { tx, throwIfNotFound = true } = options ?? {};

  // 🔹 Determinamos el cliente (Transacción prioritaria)
  const client = tx ?? prismaClient;

  return {
    searchDto,
    client,
    throwIfNotFound,
  };
};

/**
 * 🤖 buildWhereMany (Universal SICES V3)
 * ------------------------------------------------------------
 * 📌 Construye dinámicamente el objeto `where`
 * para consultas Prisma.
 *
 * ✅ Filtros específicos (AND)
 * ✅ Búsqueda global (OR)
 * ✅ Mapeo DTO → Prisma
 * ✅ Prioridad opcional de searchTerm
 */

export function buildWhereMany<TWhereInput, TDto extends Record<string, any>>(
  filters: TDto,
  options: {
    contains?: Partial<Record<keyof TDto, keyof TWhereInput>>;
    equals?: Partial<Record<keyof TDto, keyof TWhereInput>>;
    orSearch?: (keyof TWhereInput)[];
    searchTermMode?: boolean;
  },
) {
  const { searchTerm, limit, page, ...rest } = filters as any;

  const where: any = {};
  const searchTermMode = options.searchTermMode ?? false;
  const hasSearchTerm =
    !!searchTerm && options.orSearch && options.orSearch.length > 0;

  Object.keys(rest).forEach((dtoField) => {
    const value = rest[dtoField];

    if (
      value === undefined ||
      value === null ||
      value === '' ||
      (typeof value === 'string' && value.toLowerCase() === 'todos')
    ) {
      return;
    }

    if (
      searchTermMode &&
      hasSearchTerm &&
      options.contains &&
      dtoField in options.contains
    ) {
      return;
    }

    if (options.contains && dtoField in options.contains) {
      const prismaField = options.contains[dtoField as keyof TDto & string];
      where[prismaField] = { contains: value };
    } else if (options.equals && dtoField in options.equals) {
      const prismaField = options.equals[dtoField as keyof TDto & string];
      where[prismaField] = value;
    }
  });

  if (hasSearchTerm) {
    const orConditions = options.orSearch!.map((field) => ({
      [field]: { contains: searchTerm },
    }));

    if (Object.keys(where).length > 0) {
      where.AND = [{ OR: orConditions }];
    } else {
      where.OR = orConditions;
    }
  }

  return where;
}
