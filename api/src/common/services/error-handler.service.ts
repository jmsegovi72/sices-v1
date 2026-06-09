import {
  BadRequestException,
  Injectable, // <-- ¡Importante! Agrégalo para que Nest lo reconozca
  InternalServerErrorException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientValidationError,
} from '@prisma/client/runtime/client';
import { PinoLogger } from 'nestjs-pino';

// En Prisma 7, es mejor importar desde el cliente generado para evitar desincronización <-- Nueva ruta en Prisma 7

@Injectable() // <-- No olvides el decorador para poder inyectarlo en el AuthService
export class ErrorHandlerService {
  constructor(private readonly logger: PinoLogger) {}

  /**
   * Maneja directamente una promesa Prisma (ejemplo: prisma.user.findUnique(...))
   * @template T - Tipo de retorno de la operación Prisma
   * @param operation - Promesa que realiza la operación en la base de datos
   * @param serviceName - Nombre del servicio o módulo que ejecuta la operación (para logging)
   * @returns Retorna el resultado de la operación si es exitosa
   * @throws Excepciones HTTP según el tipo de error de Prisma
   */
  async handleDbQuery<T>(
    operation: Promise<T>,
    serviceName: string,
  ): Promise<T> {
    return this._handle(operation, serviceName);
  }

  /**
   * Maneja una función asíncrona que retorna una promesa Prisma.
   * Ideal para transacciones o queries complejas.
   * @template T - Tipo de retorno de la operación Prisma
   * @param operation - Función que retorna una promesa Prisma
   * @param serviceName - Nombre del servicio o módulo que ejecuta la operación (para logging)
   * @returns Retorna el resultado de la operación si es exitosa
   * @throws Excepciones HTTP según el tipo de error de Prisma
   */
  async handleDbFunction<T>(
    operation: () => Promise<T>,
    serviceName: string,
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      // Reutiliza el método interno _handle para procesar el error
      return this._handle(Promise.reject(error), serviceName);
    }
  }

  /**
   * Método interno que centraliza la captura y transformación de errores.
   * Convierte los errores de Prisma en excepciones HTTP adecuadas.
   * @template T - Tipo de retorno de la operación Prisma
   * @param operation - Promesa de la operación a manejar
   * @param serviceName - Nombre del servicio que ejecuta la operación
   * @returns Resultado de la operación si tiene éxito
   * @throws Excepciones HTTP según el tipo de error
   */
  private async _handle<T>(
    operation: Promise<T>,
    serviceName: string,
  ): Promise<T> {
    try {
      return await operation;
    } catch (error) {
      // Opción 2 (Recomendada): Tratarlo como instancia de Error
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      // Usamos el logger de Pino con el contexto del servicio
      this.logger.error(`[${serviceName}] Error en DB: ${errorMessage}`);

      if (error instanceof PrismaClientKnownRequestError) {
        this.handleKnownError(error);
      }

      if (error instanceof PrismaClientValidationError) {
        throw new BadRequestException(
          'La estructura de la consulta es inválida o faltan datos.',
        );
      }

      if (error instanceof PrismaClientInitializationError) {
        throw new ServiceUnavailableException(
          'El motor de datos no responde. Verifique conexión.',
        );
      }

      throw new InternalServerErrorException(
        'Fallo crítico en el motor de persistencia.',
      );
    }
  }

  // Extraemos la lógica de códigos para que sea más legible
  private handleKnownError(error: PrismaClientKnownRequestError): never {
    const target = (error.meta?.target as string[])?.join(', ') || 'registro';

    switch (error.code) {
      case 'P2002':
        throw new BadRequestException(
          `Conflicto de duplicidad: El valor en [${target}] ya existe.`,
        );
      case 'P2025':
        throw new NotFoundException(
          'El registro no existe o no se tiene acceso.',
        );
      case 'P2003':
        throw new BadRequestException(
          'Error de integridad: La relación con otra tabla es inválida.',
        );
      default:
        throw new BadRequestException(
          `Error de base de datos no mapeado: ${error.code}`,
        );
    }
  }
}
