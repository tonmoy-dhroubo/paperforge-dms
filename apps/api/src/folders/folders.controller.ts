import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { FoldersService } from './folders.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { RenameFolderDto } from './dto/rename-folder.dto';
import { MoveFolderDto } from './dto/move-folder.dto';
import { FolderAccessService } from './folder-access.service';
import { FolderPermissionGuard } from './guards/folder-permission.guard';
import { RequireFolderPermission } from './guards/require-folder-permission.decorator';
import { SetFolderGrantsDto } from './dto/set-folder-grants.dto';
import { FolderGrantsService } from './grants.service';

@Controller('folders')
@UseGuards(AuthGuard('jwt'))
export class FoldersController {
  constructor(
    private readonly folders: FoldersService,
    private readonly access: FolderAccessService,
    private readonly grants: FolderGrantsService,
  ) {}

  @Get('root')
  getRoot() {
    return this.folders.getRoot();
  }

  @Get(':id')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_READ', { from: 'param', key: 'id' })
  getFolder(@Param('id') id: string) {
    return this.folders.getFolder(id);
  }

  @Get(':id/children')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_READ', { from: 'param', key: 'id' })
  listChildren(@Param('id') id: string) {
    return this.folders.listChildren(id);
  }

  @Post()
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_CREATE', { from: 'body', key: 'parentId', defaultRoot: true })
  create(@Body() dto: CreateFolderDto) {
    return this.folders.createFolder(dto.name, dto.parentId);
  }

  @Patch(':id')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_RENAME', { from: 'param', key: 'id' })
  rename(@Param('id') id: string, @Body() dto: RenameFolderDto) {
    return this.folders.renameFolder(id, dto.name);
  }

  @Post(':id/move')
  async move(@Param('id') id: string, @Body() dto: MoveFolderDto, @CurrentUser() user: any) {
    await this.access.assertFolderExists(id);
    await this.access.assertFolderExists(dto.newParentId);
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    const canMove = await this.access.userHasFolderPermission(id, roles, 'FOLDER_MOVE');
    const canCreateOnTarget = await this.access.userHasFolderPermission(dto.newParentId, roles, 'FOLDER_CREATE');
    if (!canMove || !canCreateOnTarget) {
      // FolderPermissionGuard is for single target; move needs two checks.
      throw new ForbiddenException('Insufficient permissions');
    }
    return this.folders.moveFolder(id, dto.newParentId);
  }

  @Delete(':id')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_DELETE', { from: 'param', key: 'id' })
  softDelete(@Param('id') id: string) {
    return this.folders.softDeleteFolder(id);
  }

  @Post(':id/restore')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_RESTORE', { from: 'param', key: 'id' })
  restore(@Param('id') id: string) {
    return this.folders.restoreFolder(id);
  }

  @Get(':id/grants/explicit')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('GRANTS_MANAGE', { from: 'param', key: 'id' })
  listExplicitGrants(@Param('id') id: string) {
    return this.grants.listExplicit(id);
  }

  @Get(':id/grants/effective')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_READ', { from: 'param', key: 'id' })
  effectiveGrants(@Param('id') id: string) {
    return this.access.getEffectiveGrants(id);
  }

  @Put(':id/grants')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('GRANTS_MANAGE', { from: 'param', key: 'id' })
  setGrants(@Param('id') id: string, @Body() dto: SetFolderGrantsDto) {
    return this.grants.setExplicit(id, dto.grants);
  }

  @Get(':id/access')
  @UseGuards(FolderPermissionGuard)
  @RequireFolderPermission('FOLDER_READ', { from: 'param', key: 'id' })
  async myAccess(@Param('id') id: string, @CurrentUser() user: any) {
    const roles: string[] = Array.isArray(user?.roles) ? user.roles : [];
    return this.access.getUserEffectiveFolderPermissions(id, roles);
  }
}
