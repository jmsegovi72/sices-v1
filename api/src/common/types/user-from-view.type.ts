import { ViewUser } from '@prisma/client';

/**
 * Representa al usuario autenticado extraído de la vista de base de datos.
 * Se usa en controladores y decoradores @GetUser().
 */
export type UserFromView = ViewUser;
