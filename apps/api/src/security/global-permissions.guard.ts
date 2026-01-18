import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';
import { Role } from '../roles/entities/role.entity';
import { GLOBAL_PERMISSIONS_KEY } from './require-global-permission.decorator';

@Injectable()
export class GlobalPermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission) private readonly permRepo: Repository<Permission>,
    @InjectRepository(RolePermission) private readonly rolePermRepo: Repository<RolePermission>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(GLOBAL_PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest();
    const userRoles: string[] = Array.isArray(request.user?.roles) ? request.user.roles : [];
    if (userRoles.length === 0) throw new ForbiddenException('Insufficient permissions');

    const requiredNames = required.map((p) => p.trim().toUpperCase()).filter(Boolean);

    const roleNames = userRoles.map((r) => r.trim().toUpperCase()).filter(Boolean);
    if (roleNames.length === 0) throw new ForbiddenException('Insufficient permissions');

    const perms = await this.rolePermRepo
      .createQueryBuilder('rp')
      .innerJoin(Role, 'r', 'r.id = rp.roleId')
      .innerJoin(Permission, 'p', 'p.id = rp.permissionId')
      .select('DISTINCT p.name', 'name')
      .where('r.name = ANY(:roleNames)', { roleNames })
      .andWhere('p.name = ANY(:requiredNames)', { requiredNames })
      .getRawMany<{ name: string }>();

    const allowed = new Set(perms.map((row) => row.name));
    const missing = requiredNames.filter((p) => !allowed.has(p));
    if (missing.length > 0) throw new ForbiddenException('Insufficient permissions');
    return true;
  }
}
