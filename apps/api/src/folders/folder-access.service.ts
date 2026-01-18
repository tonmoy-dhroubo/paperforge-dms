import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Folder } from './entities/folder.entity';

export const ROOT_FOLDER_ID = '00000000-0000-4000-8000-000000000001';

@Injectable()
export class FolderAccessService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Folder) private readonly folderRepo: Repository<Folder>,
  ) {}

  async assertFolderExists(folderId: string) {
    const folder = await this.folderRepo.findOne({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async getNearestGrantFolder(folderId: string): Promise<{ folderId: string; depth: number } | null> {
    const rows = await this.dataSource.query(
      `
      WITH RECURSIVE anc AS (
        SELECT id, parent_id, 0 AS depth
        FROM folders
        WHERE id = $1
        UNION ALL
        SELECT f.id, f.parent_id, anc.depth + 1
        FROM folders f
        JOIN anc ON f.id = anc.parent_id
      )
      SELECT anc.id AS "folderId", anc.depth AS "depth"
      FROM anc
      JOIN folder_role_grants g ON g.folder_id = anc.id
      ORDER BY anc.depth
      LIMIT 1
      `,
      [folderId],
    );

    if (!rows || rows.length === 0) return null;
    return { folderId: rows[0].folderId, depth: Number(rows[0].depth) };
  }

  async getEffectiveGrants(folderId: string) {
    const nearest = await this.getNearestGrantFolder(folderId);
    if (!nearest) return { grantFolderId: null as string | null, depth: null as number | null, grants: [] as any[] };

    const rows = await this.dataSource.query(
      `
      SELECT r.name AS "roleName", g.operational_role AS "operationalRole"
      FROM folder_role_grants g
      JOIN roles r ON r.id = g.role_id
      WHERE g.folder_id = $1
      ORDER BY r.name ASC, g.operational_role ASC
      `,
      [nearest.folderId],
    );

    return { grantFolderId: nearest.folderId, depth: nearest.depth, grants: rows };
  }

  async listExplicitGrants(folderId: string) {
    const rows = await this.dataSource.query(
      `
      SELECT r.name AS "roleName", g.operational_role AS "operationalRole"
      FROM folder_role_grants g
      JOIN roles r ON r.id = g.role_id
      WHERE g.folder_id = $1
      ORDER BY r.name ASC, g.operational_role ASC
      `,
      [folderId],
    );
    return rows;
  }

  async getUserEffectiveFolderPermissions(folderId: string, userRoleNames: string[]) {
    const roleNames = userRoleNames.map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (await this.hasGlobalFolderBypass(roleNames)) {
      const perms = await this.dataSource.query(
        `SELECT name FROM permissions WHERE name LIKE 'FOLDER_%' OR name = 'GRANTS_MANAGE' ORDER BY name ASC`,
      );
      return { grantFolderId: null as string | null, permissions: perms.map((p: any) => p.name) };
    }

    const nearest = await this.getNearestGrantFolder(folderId);
    if (!nearest) return { grantFolderId: null as string | null, permissions: [] as string[] };

    if (roleNames.length === 0) return { grantFolderId: nearest.folderId, permissions: [] as string[] };

    const rows = await this.dataSource.query(
      `
      SELECT DISTINCT p.name AS "name"
      FROM folder_role_grants g
      JOIN roles r ON r.id = g.role_id
      JOIN operational_role_permissions orp
        ON orp.role_id = g.role_id
       AND orp.operational_role = g.operational_role
      JOIN permissions p ON p.id = orp.permission_id
      WHERE g.folder_id = $1
        AND r.name = ANY($2::text[])
      ORDER BY p.name ASC
      `,
      [nearest.folderId, roleNames],
    );

    return { grantFolderId: nearest.folderId, permissions: rows.map((r: any) => r.name) };
  }

  async userHasFolderPermission(folderId: string, userRoleNames: string[], permissionName: string) {
    const roleNames = userRoleNames.map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (await this.hasGlobalFolderBypass(roleNames)) return true;

    const { permissions } = await this.getUserEffectiveFolderPermissions(folderId, userRoleNames);
    return permissions.includes(permissionName.trim().toUpperCase());
  }

  private async hasGlobalFolderBypass(roleNames: string[]) {
    if (roleNames.length === 0) return false;
    const rows = await this.dataSource.query(
      `
      SELECT 1
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.name = ANY($1::text[])
        AND p.name = 'ACCESS_ALL_FOLDERS'
      LIMIT 1
      `,
      [roleNames],
    );
    return rows.length > 0;
  }
}
