import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ModulePermissions } from '@/common/constants/module-permissions';
import { MODULE_PERMISSION_KEY } from '../decorators/auth-module.decorator';

@Injectable()
export class ModulePermissionGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.get(
      MODULE_PERMISSION_KEY,
      context.getHandler(),
    );

    // 👉 si no tiene decorador, deja pasar
    if (!permission) return true;

    const { module, action } = permission;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const userType = user?.userType;

    const modulePermissions = ModulePermissions[module];

    if (!modulePermissions) return false;

    const allowedActions = modulePermissions[userType];

    if (!allowedActions) {
      throw new ForbiddenException('No tienes acceso a este módulo.');
    }

    if (!allowedActions.includes(action)) {
      throw new ForbiddenException('No tienes permiso para esta acción.');
    }

    return true;
  }
}
