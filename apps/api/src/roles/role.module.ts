import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity';
import { RoleController } from './role.controller';
import { RoleService } from './role.service';
import { User } from '../auth/entities/user.entity';
import { GlobalPermissionsGuard } from '../security/global-permissions.guard';
import { Permission } from '../permissions/entities/permission.entity';
import { RolePermission } from '../permissions/entities/role-permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Role, User, Permission, RolePermission])],
  controllers: [RoleController],
  providers: [RoleService, GlobalPermissionsGuard],
})
export class RoleModule {}
