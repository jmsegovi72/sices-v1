/* 🛠️ Acciones permitidas en los servicios y controladores.
 * Incluimos acciones de éxito y de error para el motor de respuestas.
 */
export const MESSAGE_ACTIONS = {
  CREATE: 'CREATE',
  CREATE_BATCH: 'CREATE_BATCH',
  FIND: 'FIND',
  FIND_ALL: 'FIND_ALL',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LOGIN: 'LOGIN',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',

  // Error
  NOT_FOUND: 'NOT_FOUND',
  CONFLICT: 'CONFLICT',
  UNAUTHORIZED: 'UNAUTHORIZED',
} as const;
