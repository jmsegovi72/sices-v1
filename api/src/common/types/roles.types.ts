/**
 * Enum con los diferentes roles de usuario dentro del sistema.
 */
export enum EnumRoles {
  ADMIN = 'Administrador',
  CAPTURISTA = 'Capturista',
  CAPTURISTA_LIMITADO = 'Capturista Limitado',
  VISOR = 'Visor',
  VISOR_LIMITADO = 'Visor Limitado',
}

/**
 * Tipo utilitario que genera una unión de cadenas
 * con los valores del enum EnumRoles.
 *
 * @example
 * type ValidRoles = 'Administrador' | 'Capturista' | 'Visor' | 'Capturista Limitado' | 'Visor Limitado';
 */
export type ValidRoles = `${EnumRoles}`;

export enum EnumUserType {
  SUPER = 'SUPER', // 🔴 super admin (máximo nivel)
  ADMINISTRATIVO = 'ADMINISTRATIVO', // 🟡 personal administrativo
  DOCENTE = 'DOCENTE', // 🟢 profesor
  ALUMNO = 'ALUMNO', // 🔵 estudiante
  CE = 'CE', // 🟣 control escolar
}
export type ValidUserType = `${EnumUserType}`;
/**
 * Mapa de niveles de acceso del sistema.
 */
export const RolesAccessLevel = {
  dbOwner: [EnumRoles.ADMIN],

  dbDataWriter: [EnumRoles.CAPTURISTA, EnumRoles.ADMIN],

  dbDataReader: [EnumRoles.VISOR, EnumRoles.CAPTURISTA, EnumRoles.ADMIN],

  dbLimitedDataWriter: [
    EnumRoles.CAPTURISTA_LIMITADO,
    EnumRoles.CAPTURISTA,
    EnumRoles.ADMIN,
  ],

  dbLimitedDataReader: [
    EnumRoles.VISOR_LIMITADO,
    EnumRoles.VISOR,
    EnumRoles.CAPTURISTA,
    EnumRoles.ADMIN,
  ],
} as const;

/**
 * Claves de niveles de acceso disponibles.
 */
export type AccessLevelKey = keyof typeof RolesAccessLevel;
