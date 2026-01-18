import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { User } from '../auth/entities/user.entity';

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private readonly roleRepo: Repository<Role>,
    @InjectRepository(User) private readonly userRepo: Repository<User>,
  ) {}

  async listRoles() {
    const roles = await this.roleRepo.find({ order: { name: 'ASC' } });
    return roles.map((r) => ({ id: r.id, name: r.name, description: r.description }));
  }

  async createRole(dto: CreateRoleDto) {
    const name = dto.name.trim().toUpperCase();
    const existing = await this.roleRepo.findOne({ where: { name } });
    if (existing) throw new ConflictException('Role already exists');

    const role = this.roleRepo.create({
      name,
      description: dto.description?.trim() || null,
    });
    const saved = await this.roleRepo.save(role);
    return { id: saved.id, name: saved.name, description: saved.description };
  }

  async assignRolesToUser(userId: string, roleNames: string[]) {
    const user = await this.userRepo.findOne({ where: { id: userId }, relations: ['roles'] });
    if (!user) throw new NotFoundException('User not found');

    const normalized = roleNames.map((r) => r.trim().toUpperCase());
    const roles = await this.roleRepo.find({ where: { name: In(normalized) } });
    if (roles.length !== normalized.length) {
      const found = new Set(roles.map((r) => r.name));
      const missing = normalized.filter((r) => !found.has(r));
      throw new NotFoundException(`Role not found: ${missing.join(', ')}`);
    }

    user.roles = roles;
    const saved = await this.userRepo.save(user);
    return {
      userId: saved.id,
      roles: saved.roles.map((r) => r.name),
    };
  }
}

