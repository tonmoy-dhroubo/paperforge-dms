import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../auth/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Folder } from '../folders/entities/folder.entity';
import { FolderRoleGrant } from '../folders/entities/folder-role-grant.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { OperationalRolePermission } from '../permissions/entities/operational-role-permission.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { Document } from '../documents/entities/document.entity';
import { DocumentVersion } from '../documents/entities/document-version.entity';
import { DocumentVersionPage } from '../documents/entities/document-version-page.entity';

const DEFAULT_DATABASE_URL =
  'postgresql://paperforge:paperforgepass@localhost:5433/paperforge?sslmode=disable';

export function typeOrmOptionsFromDatabaseUrl(databaseUrl?: string): TypeOrmModuleOptions {
  const urlString = databaseUrl || process.env.DATABASE_URL || DEFAULT_DATABASE_URL;
  const url = new URL(urlString);

  const sslmode = (url.searchParams.get('sslmode') || 'disable').toLowerCase();
  const sslEnabled = ['require', 'verify-ca', 'verify-full'].includes(sslmode);

  return {
    type: 'postgres',
    host: url.hostname,
    port: Number(url.port || 5432),
    username: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    ssl: sslEnabled ? { rejectUnauthorized: false } : false,
    entities: [
      User,
      Role,
      Permission,
      RolePermission,
      OperationalRolePermission,
      Folder,
      FolderRoleGrant,
      Document,
      DocumentVersion,
      DocumentVersionPage,
    ],
    // M1 uses DB init scripts; don't use TypeORM schema sync.
    synchronize: false,
    logging: false,
  };
}
