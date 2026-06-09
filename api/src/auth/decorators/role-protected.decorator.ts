import { SetMetadata } from '@nestjs/common';
import { AccessLevelKey } from 'src/common/types';

export const META_ROLES = 'roles';

export function RoleProtected(accessLevel?: AccessLevelKey) {
  return SetMetadata(META_ROLES, accessLevel ?? null);
}
