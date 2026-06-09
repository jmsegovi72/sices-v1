import { SetMetadata } from '@nestjs/common';
import { SystemModules } from '@/common/constants';
import { ModuleAction } from '@/common/constants/module-permissions';

export const MODULE_PERMISSION_KEY = 'module_permission';

export const AuthModulePermission = (
  module: SystemModules,
  action: ModuleAction,
) => SetMetadata(MODULE_PERMISSION_KEY, { module, action });
