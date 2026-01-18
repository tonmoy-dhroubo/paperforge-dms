import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleService } from './role.service';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';
import { RequireGlobalPermission } from '../security/require-global-permission.decorator';
import { GlobalPermissionsGuard } from '../security/global-permissions.guard';

@Controller()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('roles')
  @UseGuards(AuthGuard('jwt'))
  listRoles() {
    return this.roleService.listRoles();
  }

  @Post('roles')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_ROLES')
  createRole(@Body() body: CreateRoleDto) {
    return this.roleService.createRole(body);
  }

  @Put('users/:id/roles')
  @UseGuards(AuthGuard('jwt'), GlobalPermissionsGuard)
  @RequireGlobalPermission('MANAGE_USERS')
  assignRoles(@Param('id') id: string, @Body() body: AssignUserRolesDto) {
    return this.roleService.assignRolesToUser(id, body.roles);
  }
}
