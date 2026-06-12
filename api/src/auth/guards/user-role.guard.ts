import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import {
  AccessLevelKey,
  RolesAccessLevel,
  UserFromView,
} from 'src/common/types';
import { META_ROLES } from '../decorators/role-protected.decorator';

/**
 * Verifica si el rol del usuario tiene permisos
 * dentro del nivel de acceso especificado.
 *
 * @param role - Rol actual del usuario (por ejemplo, "Capturista")
 * @param accessLevel - Nivel de acceso requerido (por ejemplo, "dbDataWriter")
 * @returns true si el rol está permitido, false si no.
 */
const isRoleAllowed = (role: string, accessLevel: AccessLevelKey): boolean => {
  const allowedRoles = RolesAccessLevel[accessLevel] as readonly string[];
  return allowedRoles.includes(role);
};

/**
 * Guard que valida si el usuario autenticado tiene el nivel
 * de acceso necesario según su rol.
 *
 * Se utiliza junto con el decorador `@RoleProtected()` o `@Auth()`
 * para proteger rutas o controladores basados en roles definidos.
 *
 * Ejemplo de uso:
 * ```ts
 * @Auth('dbDataWriter')
 * @UseGuards(UserRoleGuard)
 * getAll() { ... }
 * ```
 */
@Injectable()
export class UserRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  /**
   * Método principal que determina si se permite o deniega el acceso.
   *
   * @param context - Contexto de ejecución de NestJS (contiene la solicitud HTTP)
   * @returns true si el usuario puede continuar, o lanza una excepción si no.
   */
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    // Obtiene el nivel de acceso requerido desde los metadatos del decorador @RoleProtected()
    const accessLevel: AccessLevelKey = this.reflector.get(
      META_ROLES,
      context.getHandler(),
    );

    // Extrae el usuario autenticado del request
    const req = context.switchToHttp().getRequest();
    const user: UserFromView = req.user;

    if (!user) {
      throw new InternalServerErrorException(
        'Ningún usuario dentro de la petición - asegúrese de que haya utilizado el AuthGuard.',
      );
    }

    // Si no se especifica un nivel de acceso en el decorador,
    // se permite el acceso a cualquier usuario autenticado.
    if (!accessLevel) return true;

    const userRole = user.roleName;

    // Validamos si el rol del usuario está dentro del nivel de acceso permitido
    if (isRoleAllowed(userRole || '', accessLevel)) return true;

    // Si no tiene permisos suficientes, lanzamos una excepción
    throw new ForbiddenException(
      `Nivel insuficiente: el usuario "${user.fullName}" no puede realizar esta operación en la base de datos.`,
    );
  }
}
