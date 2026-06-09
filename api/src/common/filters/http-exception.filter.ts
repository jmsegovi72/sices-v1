import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { HTTP_ERRORS } from '../constants';
import { qwikMessageResponse } from '../helpers';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Fallo crítico en el servidor.';
    let errorCode: keyof typeof HTTP_ERRORS = 'INTERNAL';
    let details: any = undefined;
    let invalidField: string | undefined = undefined;
    let providedValue: any = undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;

        // 1. Si es un objeto de error de validación de NestJS (ValidationPipe)
        if (Array.isArray(resObj.message)) {
          // Sanitizar y concatenar todos los mensajes de validación
          const formattedMessages = resObj.message.map((msg: string) => {
            const trimmed = msg.trim();
            return trimmed.endsWith('.') ? trimmed : `${trimmed}.`;
          });
          message = formattedMessages.join(' ');
          details = resObj.message;
          errorCode = 'BAD_REQUEST';
        } 
        // 2. Si ya viene con la estructura ApiResponse de qwikMessageResponse
        else if ('success' in resObj && 'status' in resObj) {
          const apiResponse = resObj;
          let finalMsg = apiResponse.message || '';

          if (apiResponse.error) {
            const err = apiResponse.error;
            // Si el error tiene un detalle legible y personalizado de base de datos, lo usamos como mensaje principal.
            if (err.details) {
              finalMsg = typeof err.details === 'object' ? JSON.stringify(err.details) : String(err.details);
            } else {
              // Si no tiene detalle, podemos concatenar invalidField y providedValue si existen
              const field = err.invalidField;
              const val = err.providedValue;

              if (field && !finalMsg.toLowerCase().includes(field.toLowerCase())) {
                finalMsg = `${finalMsg.trim()} (Campo: ${field})`;
              }
              if (val !== undefined) {
                const valStr = typeof val === 'object' ? JSON.stringify(val) : String(val);
                if (!finalMsg.includes(valStr)) {
                  finalMsg = `${finalMsg.trim()} (Valor: ${valStr})`;
                }
              }
            }
          }

          // Retornar directamente con el mensaje unificado
          return response.status(statusCode).json({
            ...apiResponse,
            message: finalMsg,
          });
        } 
        // 3. Cualquier otro error tipo objeto de NestJS
        else {
          message = resObj.message || exception.message || message;
          errorCode = this.getErrorCodeFromStatus(statusCode);
        }
      }
    } else {
      // Errores nativos de JavaScript o del sistema no controlados
      const err = exception as Error;
      message = err?.message || message;
      errorCode = 'INTERNAL';
    }

    // Mapear código HTTP a clave válida de HTTP_ERRORS
    const finalErrorCode = this.getErrorCodeFromStatus(statusCode);

    // Formatear la respuesta unificada con qwikMessageResponse
    const formattedResponse = qwikMessageResponse({
      success: false,
      message,
      errorCode: finalErrorCode,
      ...(details ? { errorDetails: details } : {}),
      ...(invalidField ? { invalidField } : {}),
      ...(providedValue !== undefined ? { providedValue } : {}),
    });

    response.status(statusCode).json(formattedResponse);
  }

  /**
   * Mapea un código de estado HTTP a un código de error de HTTP_ERRORS
   */
  private getErrorCodeFromStatus(status: number): keyof typeof HTTP_ERRORS {
    switch (status) {
      case 401:
        return 'UNAUTHORIZED';
      case 403:
        return 'FORBIDDEN';
      case 404:
        return 'NOT_FOUND';
      case 409:
        return 'CONFLICT';
      case 400:
        return 'BAD_REQUEST';
      default:
        return status >= 500 ? 'INTERNAL' : 'BAD_REQUEST';
    }
  }
}
