import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { FolderAccessService } from './folder-access.service';
import { FolderRoleGrant } from './entities/folder-role-grant.entity';
import { Folder } from './entities/folder.entity';
import { FoldersController } from './folders.controller';
import { FolderGrantsService } from './grants.service';
import { FoldersService } from './folders.service';
import { FolderPermissionGuard } from './guards/folder-permission.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Folder, FolderRoleGrant, Role])],
  controllers: [FoldersController],
  providers: [FoldersService, FolderAccessService, FolderGrantsService, FolderPermissionGuard],
})
export class FoldersModule {}

