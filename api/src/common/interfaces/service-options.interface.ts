import { Prisma } from '@prisma/client';

interface BaseEntityOptions {
  returnData?: boolean;
  tx?: Prisma.TransactionClient;
}

export interface CreateEntityOptions extends BaseEntityOptions {
  id?: number;
}

export interface CreateEntityParams<TDto = any> {
  userId: number;
  dto: TDto;
  options?: CreateEntityOptions;
}

interface UpdateEntityOptions extends BaseEntityOptions {
  idFieldName?: string;
}
export interface UpdateEntityParams<TDto = any> {
  userId: number;
  id: number | string;
  dto: TDto;
  options?: UpdateEntityOptions;
}
// 🔍 Interfaces para Lectura (Find)

export interface FindEntityOptions {
  /** * 💡 Si es true, lanza una excepción (404) si no encuentra el registro.
   * @default true
   */
  throwIfNotFound?: boolean;

  /** 💡 Cliente de transacción para lecturas consistentes. */
  tx?: Prisma.TransactionClient;

  /** 💡 Si es true, realiza la búsqueda en la tabla base directamente en lugar de usar vistas enriquecidas. */
  light?: boolean;
}

export interface FindEntityParams<TDto = any> {
  /** 💡 DTO de búsqueda o filtros (BaseQueryDto, SearchDto, etc.) */
  searchDto: TDto;

  /** 💡 Opciones de ejecución y contexto de base de datos. */
  options?: FindEntityOptions;
}
