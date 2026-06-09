/**
 * @file access-level.constant.ts
 * @description Define los niveles de acceso para la base de datos y el tipo AccessLevel.
 */

export const ACCESS_LEVEL = {
  dbOwner: 'dbOwner',
  dbDataWriter: 'dbDataWriter',
  dbDataReader: 'dbDataReader',
  dbLimitedDataWriter: 'dbLimitedDataWriter',
  dbLimitedDataReader: 'dbLimitedDataReader',
} as const;

// Este tipo es el que usaremos en los Guards y Decoradores
export type AccessLevel = (typeof ACCESS_LEVEL)[keyof typeof ACCESS_LEVEL];
