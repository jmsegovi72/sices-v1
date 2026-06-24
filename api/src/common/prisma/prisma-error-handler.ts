import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { APP_MESSAGES, fieldMap } from 'src/common/constants';
import { qwikMessageResponse } from '../helpers/response-messages.helper';

const humanFriendlyFields: Record<string, string> = {
  personalEmail: 'Correo personal',
  username: 'Correo institucional (Usuario)',
  institutionalMail: 'Correo institucional',
  email: 'Correo electrónico',
  personId: 'ID de persona',
  roleId: 'ID de rol',
  userTypeId: 'ID de tipo de usuario',
  classCode: 'Código de clase',
  curp: 'CURP',
  rfc: 'RFC',
  cct: 'CCT',
  phone: 'Teléfono',
  name: 'Nombre',
};

export class PrismaErrorHandler {
  static handle(error: any, anyDto: any) {
    // 🔹 1. Extraer metadata del error
    const metaCause = error.meta?.driverAdapterError?.cause?.constraint;

    const errorKey =
      metaCause?.index ||
      (metaCause?.fields ? metaCause.fields[0] : null) ||
      error.meta?.field_name ||
      error.meta?.driverAdapterError?.cause?.column || // ← agregar aquí
      (error.code === 'P2025'
        ? error.meta?.model ||
          error.meta?.modelName ||
          error.meta?.cause?.split("'")[1]
        : null) ||
      '';

    // 🔹 2. Traducir campo técnico → humano
    const translatedField = fieldMap[errorKey] || `campo técnico (${errorKey})`;

    // 🔹 3. Extraer valor conflictivo
    const originalMessage =
      error.meta?.driverAdapterError?.cause?.originalMessage || '';

    const extractedValue =
      anyDto[translatedField] || // ← 'classCode' → anyDto.classCode → 'FOR22-08-2025'
      anyDto[errorKey] || // ← 'class_code' → undefined
      originalMessage.match(/'([^']+)'/)?.[1] ||
      anyDto['id'] ||
      'no existe';

    // 🔹 4. Manejo de errores conocidos de Prisma
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const baseErrorDetails = {
        invalidField: translatedField,
        providedValue: extractedValue,
      };

      switch (error.code) {
        case 'P2002': {
          // Intentamos obtener el campo real de error.meta.target o resolver mediante errorKey
          const targetField = Array.isArray(error.meta?.target)
            ? error.meta.target[0]
            : typeof error.meta?.target === 'string'
              ? error.meta.target
              : errorKey;

          // Mapeamos el campo al nombre en el DTO o código
          const codeField = fieldMap[targetField] || targetField;

          // Traducimos a nombre legible en español
          const humanField = humanFriendlyFields[codeField] || codeField;

          // Mensaje humanizado contextual
          const targetFields = Array.isArray(error.meta?.target) ? error.meta.target : [error.meta?.target];
          const hasPersonAndProgram = targetFields.includes('personId') && targetFields.includes('educationalProgramId');
          const isUniquePersonProgram = hasPersonAndProgram || 
                                        targetField === 'unique_person_educational_program' || 
                                        errorKey === 'unique_person_educational_program';

          let contextualMessage = `El valor '${extractedValue}' ya está asignado al campo '${humanField}'.`;
          if (isUniquePersonProgram) {
            contextualMessage = `La persona ya está registrada en este programa.`;
          } else if (codeField === 'username' || codeField === 'institutionalMail') {
            contextualMessage = `El correo institucional '${extractedValue}' ya está registrado para otro usuario.`;
          } else if (codeField === 'personalEmail' || codeField === 'email') {
            contextualMessage = `El correo electrónico '${extractedValue}' ya está en uso.`;
          } else if (codeField === 'curp') {
            contextualMessage = `La CURP '${extractedValue}' ya está registrada en el sistema.`;
          } else if (codeField === 'rfc') {
            contextualMessage = `El RFC '${extractedValue}' ya está registrado en el sistema.`;
          }

          throw new ConflictException(
            qwikMessageResponse({
              success: false,
              message: APP_MESSAGES.error.DB.UNIQUE,
              errorCode: 'CONFLICT',
              invalidField: codeField,
              providedValue: extractedValue,
              errorDetails: contextualMessage,
            }),
          );
        }

        case 'P2003':
          throw new BadRequestException(
            qwikMessageResponse({
              success: false,
              message: APP_MESSAGES.error.DB.FOREIGN_KEY,
              errorCode: 'BAD_REQUEST',
              ...baseErrorDetails,
              errorDetails: `El '${translatedField}' seleccionado no existe o no es válido.`,
            }),
          );

        case 'P2000':
          throw new BadRequestException(
            qwikMessageResponse({
              success: false,
              message: APP_MESSAGES.error.DB.VALUE_TOO_LONG,
              errorCode: 'BAD_REQUEST',
              ...baseErrorDetails,
              errorDetails: `El valor en '${translatedField}' excede el límite permitido.`,
            }),
          );

        case 'P2025': {
          // Buscar el ID en cualquier nested connect del DTO transformado
          const nestedValue = Object.values(anyDto).find(
            (val: any) => val?.connect?.id !== undefined,
          ) as any;

          const failedId = nestedValue?.connect?.id ?? 'no existe';

          throw new BadRequestException(
            qwikMessageResponse({
              success: false,
              message: APP_MESSAGES.error.DB.NOT_FOUND,
              errorCode: 'NOT_FOUND',
              invalidField: translatedField,
              providedValue: failedId,
              errorDetails: `El campo '${translatedField}' con ID '${failedId}' no existe en el catálogo.`,
            }),
          );
        }

        default:
          throw new InternalServerErrorException(
            qwikMessageResponse({
              success: false,
              message: `Error técnico de base de datos (${error.code})`,
              errorCode: 'INTERNAL',
              ...baseErrorDetails,
              errorDetails: `Error inesperado en el campo '${translatedField}'.`,
            }),
          );
      }
    }

    throw new InternalServerErrorException(
      qwikMessageResponse({
        success: false,
        message: APP_MESSAGES.error.GENERAL,
        errorCode: 'INTERNAL',
      }),
    );
  }
}
