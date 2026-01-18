import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from '../roles/entities/role.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { OperationalRolePermission } from './entities/operational-role-permission.entity';
import { Permission } from './entities/permission.entity';
import { RolePermission } from './entities/role-permission.entity';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private readonly rolePermRepo: Repository<RolePermission>,
    @InjectRepository(OperationalRolePermission)
    private readonly opRolePermRepo: Repository<OperationalRolePermission>,
  ) {}

  async listPermissions() {
    const perms = await this.permRepo.find({ order: { name: 'ASC' } });
    return perms.map((p) => ({ id: p.id, name: p.name, description: p.description }));
  }

  async createPermission(dto: CreatePermissionDto) {
    const name = dto.name.trim().toUpperCase();
    const existing = await this.permRepo.findOne({ where: { name } });
    if (existing) throw new ConflictException('Permission already exists');

    const perm = this.permRepo.create({ name, description: dto.description?.trim() || null });
    const saved = await this.permRepo.save(perm);
    return { id: saved.id, name: saved.name, description: saved.description };
  }

  async getRoleByName(roleName: string) {
    const name = roleName.trim().toUpperCase();
    const role = await this.roleRepo.findOne({ where: { name } });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async getPermissionIdsByNames(names: string[]) {
    const normalized = names.map((n) => n.trim().toUpperCase()).filter(Boolean);
    if (normalized.length === 0) return [];

    const perms = await this.permRepo.find({ where: { name: In(normalized) } });
    if (perms.length !== normalized.length) {
      const found = new Set(perms.map((p) => p.name));
      const missing = normalized.filter((n) => !found.has(n));
      throw new NotFoundException(`Permission not found: ${missing.join(', ')}`);
    }
    return perms.map((p) => p.id);
  }

  async listGlobalRolePermissions(roleName: string) {
    const role = await this.getRoleByName(roleName);
    const rolePerms = await this.rolePermRepo.find({ where: { roleId: role.id } });
    const permIds = rolePerms.map((rp) => rp.permissionId);
    if (permIds.length === 0) return [];
    const perms = await this.permRepo.find({ where: { id: In(permIds) }, order: { name: 'ASC' } });
    return perms.map((p) => p.name);
  }

  async setGlobalRolePermissions(roleName: string, permissionNames: string[]) {
    const role = await this.getRoleByName(roleName);
    const permIds = await this.getPermissionIdsByNames(permissionNames);

    await this.rolePermRepo.delete({ roleId: role.id });
    if (permIds.length) {
      await this.rolePermRepo.save(permIds.map((permissionId) => ({ roleId: role.id, permissionId })));
    }

    return { role: role.name, permissions: await this.listGlobalRolePermissions(role.name) };
  }

  async listOperationalRolePermissions(roleName: string, operationalRole: 'OWNER' | 'VIEWER') {
    const role = await this.getRoleByName(roleName);
    const rows = await this.opRolePermRepo.find({
      where: { roleId: role.id, operationalRole },
    });
    const permIds = rows.map((r) => r.permissionId);
    if (permIds.length === 0) return [];
    const perms = await this.permRepo.find({ where: { id: In(permIds) }, order: { name: 'ASC' } });
    return perms.map((p) => p.name);
  }

  async setOperationalRolePermissions(
    roleName: string,
    operationalRole: 'OWNER' | 'VIEWER',
    permissionNames: string[],
  ) {
    const role = await this.getRoleByName(roleName);
    const permIds = await this.getPermissionIdsByNames(permissionNames);

    await this.opRolePermRepo.delete({ roleId: role.id, operationalRole });
    if (permIds.length) {
      await this.opRolePermRepo.save(
        permIds.map((permissionId) => ({
          roleId: role.id,
          operationalRole,
          permissionId,
        })),
      );
    }

    return {
      role: role.name,
      operationalRole,
      permissions: await this.listOperationalRolePermissions(role.name, operationalRole),
    };
  }
}

