import { SetMetadata } from '@nestjs/common';

export type FolderIdSource =
  | { from: 'param'; key: string; defaultRoot?: boolean }
  | { from: 'body'; key: string; defaultRoot?: boolean };

export const FOLDER_PERMISSION_KEY = 'folder_permission';

export const RequireFolderPermission = (permission: string, folderId: FolderIdSource) =>
  SetMetadata(FOLDER_PERMISSION_KEY, { permission, folderId });

