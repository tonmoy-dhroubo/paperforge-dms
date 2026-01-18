import { SetMetadata } from '@nestjs/common';

export const GLOBAL_PERMISSIONS_KEY = 'global_permissions';
export const RequireGlobalPermission = (...permissions: string[]) =>
  SetMetadata(GLOBAL_PERMISSIONS_KEY, permissions);

