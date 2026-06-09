import { applyDecorators, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AccessLevelKey } from 'src/common/types';
import { UserRoleGuard } from '../guards/user-role.guard';
import { RoleProtected } from './role-protected.decorator';

export function Auth(accessLevel?: AccessLevelKey) {
  return applyDecorators(
    // 1. Validamos el Token (JWT).
    // Es importante pasarle 'jwt' si ese es el nombre de tu estrategia.
    UseGuards(AuthGuard('jwt'), UserRoleGuard),

    // 2. Definimos el nivel de acceso para que el UserRoleGuard lo lea.
    // Si accessLevel es undefined, el Guard dejará pasar a cualquier usuario autenticado.
    RoleProtected(accessLevel),
  );
}
