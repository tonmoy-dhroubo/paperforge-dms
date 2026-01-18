import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { GlobalPermissionsGuard } from '../security/global-permissions.guard';
import { Permission } from './entities/permission.entity';
import { OperationalRolePermission } from './entities/operational-role-permission.entity';
import { RolePermission } from './entities/role-permission.entity';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, RolePermission, OperationalRolePermission])],
  controllers: [PermissionsController],
  providers: [PermissionsService, GlobalPermissionsGuard],
})
export class PermissionsModule {}

