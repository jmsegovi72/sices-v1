import { HttpStatus } from '@nestjs/common';

export const APP_MESSAGES = {
  /* ============================================================
     ✅ SUCCESS
  ============================================================ */
  success: {
    GENERAL: 'Operación realizada correctamente.',

    AUTH: {
      LOGIN: 'Bienvenido al sistema.',
      PASSWORD_CHANGED: 'Contraseña actualizada correctamente.',
    },

    USERS: {
      TOGGLE_ACTIVE: (name: string, status: string) =>
        `El usuario ${name} ahora está ${status} en el sistema.`,
      RESET_PASSWORD: (username: string) =>
        `Contraseña restablecida para ${username}. Se ha activado el cambio obligatorio.`,
    },

    STAFF: {
      TOGGLE_ACTIVE: (name: string, status: string) =>
        `El personal ${name} ahora está ${status} en el sistema.`,
    },

    DB: {
      CREATE: 'Registro creado correctamente.',
      UPDATE: 'Registro actualizado correctamente.',
      DELETE: 'Registro eliminado correctamente.',
      FIND: 'Registro encontrado.',
      FIND_ALL: 'Registros recuperados correctamente.',
      CREATE_BATCH: 'Registros creados correctamente.',
    },

    FILE: {
      UPLOAD: 'Archivo subido correctamente.',
      DOWNLOAD: 'Archivo descargado correctamente.',
    },
  },

  /* ============================================================
     ❌ ERROR
  ============================================================ */
  error: {
    GENERAL: 'Ocurrió un error inesperado.',

    /* 🔐 AUTH */
    AUTH: {
      INVALID: 'Credenciales no válidas.',
      CHANGE_PASSWORD: 'Debe cambiar su contraseña para continuar.',
    },

    /* 👤 USERS */
    USERS: {
      NOT_FOUND: (id: number | string) =>
        `El usuario con ID ${id} no fue localizado.`,
    },

    STAFF: {
      NOT_FOUND: (id: number | string) =>
        `El personal con ID ${id} no fue localizado.`,
    },

    /* 🧪 VALIDATION (DTO, Pipes, Input) */
    VALIDATION: {
      INVALID_ID: 'El ID debe ser un número entero positivo válido.',
      REQUIRED_FIELD: 'Este campo es obligatorio.',
      INVALID_FORMAT: 'Formato inválido.',
    },

    /* 🗄️ DB (incluye Prisma) */
    DB: {
      INTERNAL: 'Error interno en la base de datos.',
      TIMEOUT: 'El tiempo de consulta se ha agotado.',

      INVALID_DATA: 'Los datos proporcionados no son válidos.',
      MISSING_REQUIRED_FIELDS: 'Faltan campos obligatorios por completar.',
      VALUE_TOO_LONG:
        'El valor proporcionado es demasiado largo para este campo.',

      UNIQUE: 'El valor ingresado ya está en uso.',
      FOREIGN_KEY: 'El dato relacionado no existe.',

      NOT_FOUND: 'No se encontró el registro solicitado.',
      UPDATE_FAILED: 'No se pudieron actualizar los datos.',
    },

    /* 🌐 HTTP (solo códigos) */
    HTTP: {
      BAD_REQUEST_CODE: HttpStatus.BAD_REQUEST,
      UNAUTHORIZED_CODE: HttpStatus.UNAUTHORIZED,
      FORBIDDEN_CODE: HttpStatus.FORBIDDEN,
      NOT_FOUND_CODE: HttpStatus.NOT_FOUND,
      CONFLICT_CODE: HttpStatus.CONFLICT,
      INTERNAL_CODE: HttpStatus.INTERNAL_SERVER_ERROR,
    },
  },

  /* ============================================================
     🔖 CÓDIGOS INTERNOS
  ============================================================ */
  codes: {
    FIRST_LOGIN_REQUIRED: 'FIRST_LOGIN_REQUIRED',
  },

  /* ============================================================
     🌐 HTTP SUCCESS CODES
  ============================================================ */
  http: {
    OK: HttpStatus.OK,
    CREATED: HttpStatus.CREATED,
  },
} as const;
