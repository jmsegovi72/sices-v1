// access-level-user.decorator.ts
import {
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  AccessLevelKey,
  RolesAccessLevel,
  UserFromView,
} from 'src/common/types';

const isRoleAllowed = (role: string, accessLevel: AccessLevelKey): boolean => {
  const allowedRoles = RolesAccessLevel[accessLevel] as readonly string[];
  return allowedRoles.includes(role);
};

export const AccessLevelUser = createParamDecorator(
  (
    accessLevel: AccessLevelKey | undefined,
    ctx: ExecutionContext,
  ): UserFromView => {
    // 👈 Retorno tipado
    const req = ctx.switchToHttp().getRequest();
    const user: UserFromView = req.user; // 👈 Usamos la vista plana

    if (!user) {
      throw new InternalServerErrorException(
        'Ningún usuario dentro de la petición - asegúrese de que haya utilizado el AuthGuard',
      );
    }

    // Si no se requiere nivel específico, devolvemos el usuario tal cual
    if (!accessLevel) return user;

    // Validación contra el roleName que ya viene plano de la View
    const userRole = user.roleName;

    if (isRoleAllowed(userRole, accessLevel)) return user;

    // Mensaje profesional usando el fullName calculado de la View
    throw new ForbiddenException(
      `Acceso denegado: El usuario "${user.fullName}" no cuenta con el nivel de acceso "${accessLevel}".`,
    );
  },
);
