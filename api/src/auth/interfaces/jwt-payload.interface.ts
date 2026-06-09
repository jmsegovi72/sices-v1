import { ValidRoles, ValidUserType } from '@/common/types';

/**
 * 🎟️ Payload del JWT
 * - isTemp: indica token temporal (primer login / cambio de contraseña)
 */
export interface JwtPayload {
  id: number;
  role?: ValidRoles;
  userType?: ValidUserType;
  isTemp?: boolean; // 👈 🔥 AGREGA ESTA LÍNEA
  iat?: number;
  exp?: number;
}
