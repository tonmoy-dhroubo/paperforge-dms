import { Body, Controller, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from './roles.decorator';
import { RolesGuard } from './roles.guard';
import { CreateRoleDto } from './dto/create-role.dto';
import { RoleService } from './role.service';
import { AssignUserRolesDto } from './dto/assign-user-roles.dto';

@Controller()
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Get('roles')
  @UseGuards(AuthGuard('jwt'))
  listRoles() {
    return this.roleService.listRoles();
  }

  @Post('roles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  createRole(@Body() body: CreateRoleDto) {
    return this.roleService.createRole(body);
  }

  @Put('users/:id/roles')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('ADMIN')
  assignRoles(@Param('id') id: string, @Body() body: AssignUserRolesDto) {
    return this.roleService.assignRolesToUser(id, body.roles);
  }
}

