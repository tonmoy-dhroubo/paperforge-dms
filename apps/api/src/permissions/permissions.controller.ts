import { BadRequestException, Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequireGlobalPermission } from '../security/require-global-permission.decorator';
import { GlobalPermissionsGuard } from '../security/global-permissions.guard';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { SetPermissionsDto } from './dto/set-permissions.dto';
import { PermissionsService } from './permissions.service';

@Controller()
export class PermissionsController {
  constructor(private readonly permissions: PermissionsService) {}

  @Get('permissions')
  @UseGuards(AuthGuard('jwt'))
  list() {
    return this.permissions.listPermissions();
  }

  @Post('permissions')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_PERMISSIONS')
  create(@Body() dto: CreatePermissionDto) {
    return this.permissions.createPermission(dto);
  }

  @Get('roles/:roleName/permissions')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_PERMISSIONS')
  listRolePermissions(@Param('roleName') roleName: string) {
    return this.permissions.listGlobalRolePermissions(roleName);
  }

  @Put('roles/:roleName/permissions')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_PERMISSIONS')
  setRolePermissions(@Param('roleName') roleName: string, @Body() body: SetPermissionsDto) {
    return this.permissions.setGlobalRolePermissions(roleName, body.permissions || []);
  }

  @Get('roles/:roleName/operational/:operationalRole/permissions')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_PERMISSIONS')
  listOperational(
    @Param('roleName') roleName: string,
    @Param('operationalRole') operationalRole: string,
  ) {
    const op = operationalRole.trim().toUpperCase();
    if (op !== 'OWNER' && op !== 'VIEWER') throw new BadRequestException('Invalid operationalRole');
    return this.permissions.listOperationalRolePermissions(roleName, op);
  }

  @Put('roles/:roleName/operational/:operationalRole/permissions')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_PERMISSIONS')
  setOperational(
    @Param('roleName') roleName: string,
    @Param('operationalRole') operationalRole: string,
    @Body() body: SetPermissionsDto,
  ) {
    const op = operationalRole.trim().toUpperCase();
    if (op !== 'OWNER' && op !== 'VIEWER') throw new BadRequestException('Invalid operationalRole');
    return this.permissions.setOperationalRolePermissions(roleName, op, body.permissions || []);
  }
}
