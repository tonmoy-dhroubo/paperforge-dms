import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FolderAccessService, ROOT_FOLDER_ID } from '../folder-access.service';
import { FOLDER_PERMISSION_KEY, type FolderIdSource } from './require-folder-permission.decorator';

@Injectable()
export class FolderPermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: FolderAccessService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const meta:
      | { permission: string; folderId: FolderIdSource }
      | undefined = this.reflector.getAllAndOverride(FOLDER_PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!meta) return true;

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = Array.isArray(request.user?.roles) ? request.user.roles : [];

    const folderId = this.resolveFolderId(meta.folderId, request);
    await this.access.assertFolderExists(folderId);

    const permissionName = meta.permission.trim().toUpperCase();
    const ok = await this.access.userHasFolderPermission(folderId, userRoles, permissionName);
    if (!ok) throw new ForbiddenException('Insufficient permissions');
    return true;
  }

  private resolveFolderId(source: FolderIdSource, request: any) {
    const value =
      source.from === 'param' ? request.params?.[source.key] : request.body?.[source.key];

    if (!value && source.defaultRoot) return ROOT_FOLDER_ID;
    if (!value) throw new BadRequestException('Missing folder id');
    return value;
  }
}
