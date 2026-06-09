/**
 * 📦 Permisos por módulo y tipo de usuario
 *
 * 🔹 Define qué acciones puede realizar cada tipo de usuario
 * 🔹 Se usa junto con SystemModules
 */

import { EnumUserType } from '../types';
import { SystemModules } from './system-module.constant';

/**
 * 🔹 Acciones permitidas
 */
export type ModuleAction = 'create' | 'read' | 'update' | 'delete';

/**
 * 🔹 Helper para permisos globales
 */
const withGlobalAccess = (
  permissions: Partial<Record<EnumUserType, ModuleAction[]>>,
): Partial<Record<EnumUserType, ModuleAction[]>> => ({
  ...permissions,

  // 🔴 SUPER → acceso total
  [EnumUserType.SUPER]: ['create', 'read', 'update', 'delete'],

  // 🟣 CE → gestión por defecto
  [EnumUserType.CE]: permissions[EnumUserType.CE] ?? [
    'create',
    'read',
    'update',
  ],
});

/**
 * 📦 Permisos por módulo
 */
export const ModulePermissions: Record<
  SystemModules,
  Partial<Record<EnumUserType, ModuleAction[]>>
> = {
  [SystemModules.GRADES]: withGlobalAccess({
    // [EnumUserType.DOCENTE]: ['create', 'read', 'update'],
    // [EnumUserType.ALUMNO]: ['read'],
  }),

  [SystemModules.ENROLLMENTS]: withGlobalAccess({
    // [EnumUserType.ALUMNO]: ['create', 'read'],
    //[EnumUserType.DOCENTE]: [],
  }),

  [SystemModules.PERSONS]: withGlobalAccess({}),
  [SystemModules.ZIP_CODES]: withGlobalAccess({}),
  [SystemModules.ADDRESSES]: withGlobalAccess({}),
  [SystemModules.STUDENTS]: withGlobalAccess({}),
  [SystemModules.SCHOOLS_OF_ORIGIN]: withGlobalAccess({}),
  [SystemModules.DEMOGRAPHICS]: withGlobalAccess({}),
  [SystemModules.EMERGENCY_CONTACTS]: withGlobalAccess({
    // Si en el futuro el ALUMNO puede editar sus propios contactos,
    // aquí agregaríamos: [EnumUserType.ALUMNO]: ['create', 'read', 'update']
  }),
  [SystemModules.CLASSES]: withGlobalAccess({}),
  [SystemModules.USERS]: withGlobalAccess({
    // 🚫 Bloqueamos explícitamente a Control Escolar
    [EnumUserType.CE]: [],

    // ✅ El SUPER ya tiene acceso total por la función withGlobalAccess,
    // pero puedes dejarlo explícito si prefieres por claridad visual:
    [EnumUserType.SUPER]: ['create', 'read', 'update', 'delete'],
  }),
  [SystemModules.STUDENT_ACADEMIC_BACKGROUNDS]: withGlobalAccess({
    // 🔮 Futuro: cuando el alumno llene su propia ficha de inscripción
    // [EnumUserType.ALUMNO]: ['create', 'read', 'update'],
  }),
  [SystemModules.STAFF]: withGlobalAccess({}),
  [SystemModules.TEACHING_LOAD]: withGlobalAccess({}),
};
