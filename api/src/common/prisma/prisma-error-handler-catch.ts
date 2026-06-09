import { InternalServerErrorException } from '@nestjs/common';

import { PinoLogger } from 'nestjs-pino';
import { PrismaErrorHandler } from './prisma-error-handler';

export const prismaErrorHandleCatch = (
  serviceName: string,
  methodName: string,
  logger: PinoLogger,
  dto: unknown,
  error: any,
): never => {
  logger.error(
    {
      service: serviceName,
      method: methodName,
      dto,
      error,
    },
    `Error en la base de datos, provocado por el método ${methodName} del servicio ${serviceName}`,
  );
  PrismaErrorHandler.handle(error, dto);
  // Maneja cualquier otro error que no sea de prisma
  throw new InternalServerErrorException('Error interno en el servidor.');
};
