import { HttpStatus } from '@nestjs/common';

export const APP_MESSAGES_OLD = {
  success: {
    GENERAL: 'Operación realizada correctamente.',
    OK: 'ok',
    USERS: {
      TOGGLE_ACTIVE: (name: string, status: string) =>
        `El usuario ${name} ahora está ${status} en el sistema.`,
      RESET_PASSWORD: (username: string) =>
        `Contraseña restablecida para ${username}. Se ha activado el cambio obligatorio.`,
    },
    // Base de Datos
    DB: {
      CREATE: 'Registro creado correctamente.',
      UPDATE: 'Registro actualizado correctamente.',
      DELETE: 'Registro eliminado correctamente.',
      FIND: 'Registro encontrado.',
      FIND_ALL: 'Registros recuperados correctamente.',
      CREATE_BATCH: 'Registros creados correctamente.',
    },
    // Archivos
    FILE: {
      UPLOAD: 'Archivo subido correctamente.',
      DOWNLOAD: 'Archivo descargado correctamente.',
    },
    HTTP: {
      OK_CODE: HttpStatus.OK, // 200
      CREATED_CODE: HttpStatus.CREATED, // 201
    },
    AUTH: {
      LOGIN_SUCCESS: 'Bienvenido al sistema.',
      PASSWORD_CHANGED: 'Contraseña actualizada correctamente.',
    },
  },

  error: {
    // Generales
    GENERAL: 'Ocurrió un error inesperado.',
    BAD_REQUEST: 'Solicitud incorrecta. Verifique los datos.',
    NOT_FOUND: 'El registro solicitado no existe.',
    USERS: {
      NOT_FOUND: (id: number | string) =>
        `El usuario con ID ${id} no fue localizado en la base de datos.`,
    },

    PRISMA: {
      VALUE_TOO_LONG:
        'El valor proporcionado es demasiado largo para este campo.',
      UNIQUE_CONSTRAINT_FAILED:
        'El registro ya existe (violación de restricción única).',
      FOREIGN_KEY_CONSTRAINT:
        'Error de referencia: El dato relacionado no existe.',
      INVALID_DATA:
        'Los datos proporcionados no son válidos para la base de datos.',
      MISSING_REQUIRED_FIELDS: 'Faltan campos obligatorios por completar.',
      RECORD_NOT_FOUND: 'No se encontró el registro solicitado.',
      DATABASE_INTERNAL_ERROR: 'Error interno en el motor de base de datos.',
      QUERY_TIMEOUT: 'La consulta tardó demasiado tiempo en responder.',
    },

    // Autenticación (Lo que acabamos de terminar)
    AUTH: {
      INVALID: 'Credenciales no válidas.',
      FIRST_LOGIN: 'FIRST_LOGIN_REQUIRED',
      CHANGE_PASSWORD: 'El usuario debe cambiar su contraseña para continuar.',
    },

    // Base de Datos / Prisma
    DB: {
      UNIQUE: 'El valor ingresado ya está en uso.',
      FOREIGN_KEY: 'Error de referencia: El dato relacionado no existe.',
      TIMEOUT: 'El tiempo de consulta se ha agotado.',
      INTERNAL: 'Error interno en la base de datos.',
      VALUE_TOO_LONG:
        'El valor proporcionado es demasiado largo para este campo.',
      UNIQUE_CONSTRAINT_FAILED:
        'El registro ya existe (violación de restricción única).',
      FOREIGN_KEY_CONSTRAINT:
        'Error de referencia: El dato relacionado no existe.',
      INVALID_DATA:
        'Los datos proporcionados no son válidos para la base de datos.',
      MISSING_REQUIRED_FIELDS: 'Faltan campos obligatorios por completar.',
      RECORD_NOT_FOUND: 'No se encontró el registro solicitado.',
      DATABASE_INTERNAL_ERROR: 'Error interno en el motor de base de datos.',
      QUERY_TIMEOUT: 'La consulta tardó demasiado tiempo en responder.',
      UPDATE_FAILED: 'No se pudieron actualizar los datos',
    },

    // Archivos
    FILE: {
      REQUIRED: 'Debe subir un archivo.',
      TYPE: 'Formato de archivo no permitido.',
      LARGE: 'El archivo excede el tamaño máximo (2MB).',
    },

    HTTP: {
      BAD_REQUEST: 'Bad Request',
      UNAUTHORIZED: 'Unauthorized',
      FORBIDDEN: 'Forbidden',
      NOT_FOUND: 'Not Found',
      METHOD_NOT_ALLOWED: 'Method Not Allowed',
      CONFLICT: 'Conflict',
      UNPROCESSABLE_ENTITY: 'Unprocessable Entity',
      TOO_MANY_REQUESTS: 'Too Many Requests',
      INTERNAL_SERVER_ERROR: 'Internal Server Error',
      SERVICE_UNAVAILABLE: 'Service Unavailable',
      GATEWAY_TIMEOUT: 'Gateway Timeout',
      UNAUTHORIZED_CODE: HttpStatus.UNAUTHORIZED,
      FORBIDDEN_CODE: HttpStatus.FORBIDDEN,
      NOT_FOUND_CODE: HttpStatus.NOT_FOUND,
      CONFLICT_CODE: HttpStatus.CONFLICT, // 409 (Útil para CURP/Email duplicado)
      INTERNAL_CODE: HttpStatus.INTERNAL_SERVER_ERROR,
    },
  },
} as const;
