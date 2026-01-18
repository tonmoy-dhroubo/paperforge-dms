import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { FolderRoleGrant } from './entities/folder-role-grant.entity';
import { Folder } from './entities/folder.entity';

@Injectable()
export class FolderGrantsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Folder) private readonly folderRepo: Repository<Folder>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(FolderRoleGrant) private readonly grantRepo: Repository<FolderRoleGrant>,
  ) {}

  async listExplicit(folderId: string) {
    const exists = await this.folderRepo.exist({ where: { id: folderId } });
    if (!exists) throw new NotFoundException('Folder not found');

    return this.dataSource.query(
      `
      SELECT r.name AS "roleName", g.operational_role AS "operationalRole"
      FROM folder_role_grants g
      JOIN roles r ON r.id = g.role_id
      WHERE g.folder_id = $1
      ORDER BY r.name ASC, g.operational_role ASC
      `,
      [folderId],
    );
  }

  async setExplicit(
    folderId: string,
    grants: Array<{ roleName: string; operationalRole: 'OWNER' | 'VIEWER' }>,
  ) {
    const folder = await this.folderRepo.findOne({ where: { id: folderId } });
    if (!folder) throw new NotFoundException('Folder not found');
    if (folder.isDeleted) throw new BadRequestException('Folder is deleted');

    const normalized = grants.map((g) => ({
      roleName: g.roleName.trim().toUpperCase(),
      operationalRole: g.operationalRole,
    }));

    const roleNames = [...new Set(normalized.map((g) => g.roleName))];
    const roles = await this.roleRepo.find({ where: { name: In(roleNames) } });
    if (roles.length !== roleNames.length) {
      const found = new Set(roles.map((r) => r.name));
      const missing = roleNames.filter((n) => !found.has(n));
      throw new NotFoundException(`Role not found: ${missing.join(', ')}`);
    }

    await this.grantRepo.delete({ folderId });

    const roleIdByName = new Map(roles.map((r) => [r.name, r.id]));
    const rows = normalized.map((g) => {
      const roleId = roleIdByName.get(g.roleName);
      if (!roleId) throw new BadRequestException('Invalid role');
      if (g.operationalRole !== 'OWNER' && g.operationalRole !== 'VIEWER') {
        throw new BadRequestException('Invalid operationalRole');
      }
      return this.grantRepo.create({
        folderId,
        roleId,
        operationalRole: g.operationalRole,
      });
    });

    await this.grantRepo.save(rows);
    return this.listExplicit(folderId);
  }
}
