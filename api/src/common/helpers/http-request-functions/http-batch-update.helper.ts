import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PinoLogger } from 'nestjs-pino';
import { APP_MESSAGES } from '@/common/constants';
import { ApiResponse } from '@/common/interfaces';
import { qwikMessageResponse } from '../response-messages.helper';
import { httpRequestUpdate } from './http-update.helper';

export interface BatchUpdateParams<T> {
  prisma: PrismaClient;
  logger: PinoLogger;
  userId: number;
  updates: T[];
  txModel: {
    update: (args: { where: any; data: any }) => Promise<any>;
  };
  fieldKey: keyof T;
  idFieldKey?: keyof T; // ← opcional, default 'id'
  dbIdFieldKey?: string; // ← opcional, default 'id'
  updatedByRelation: string;
  successMessage: string;
  errorContext: string;
  serviceName: string;
}

export async function httpRequestBatchUpdate<T>({
  prisma,
  logger,
  userId,
  updates,
  txModel,
  fieldKey,
  idFieldKey = 'id' as keyof T, // ← default 'id'
  dbIdFieldKey = 'id', // ← default 'id'
  updatedByRelation,
  successMessage,
  errorContext,
  serviceName,
}: BatchUpdateParams<T>): Promise<ApiResponse<void>> {
  try {
    await prisma.$transaction(async () => {
      const updatePromises = updates.map((updateData) => {
        const idValue = updateData[idFieldKey] as unknown as number;
        console.log('idFieldKey:', idFieldKey);
        console.log('updateData:', updateData);
        console.log('idValue:', idValue);

        return httpRequestUpdate({
          serviceName,
          model: txModel,
          logger,
          idValue,
          data: {
            [fieldKey]: updateData[fieldKey],
            [updatedByRelation]: { connect: { id: userId } },
          },
          returnData: false,
          idFieldName: dbIdFieldKey,
        });
      });

      await Promise.all(updatePromises);
    });

    return qwikMessageResponse({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    // 🔹 Si es un error HTTP conocido (404, 400, etc.) → dejarlo pasar
    if (error instanceof HttpException) {
      throw error; // ← no convertir a 500
    }

    // 🔹 Solo errores desconocidos → 500
    logger.error(
      { error, errorContext },
      `Error en actualización batch de ${errorContext}`,
    );
    throw new InternalServerErrorException(
      qwikMessageResponse({
        success: false,
        message: APP_MESSAGES.error.DB.INTERNAL,
        errorCode: 'INTERNAL',
        errorDetails: `No se pudieron actualizar los ${errorContext}`,
      }),
    );
  }
}
