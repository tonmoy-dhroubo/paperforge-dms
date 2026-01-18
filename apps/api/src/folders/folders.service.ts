import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FolderAccessService, ROOT_FOLDER_ID } from './folder-access.service';
import { Folder } from './entities/folder.entity';

@Injectable()
export class FoldersService {
  constructor(
    @InjectRepository(Folder) private readonly folderRepo: Repository<Folder>,
    private readonly access: FolderAccessService,
  ) {}

  async getRoot() {
    const folder = await this.folderRepo.findOne({ where: { id: ROOT_FOLDER_ID } });
    if (!folder) throw new NotFoundException('Root folder not found (recreate DB volume)');
    return folder;
  }

  async getFolder(id: string) {
    const folder = await this.folderRepo.findOne({ where: { id } });
    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async listChildren(parentId: string) {
    await this.access.assertFolderExists(parentId);
    return this.folderRepo.find({
      where: { parentId, isDeleted: false },
      order: { name: 'ASC' },
    });
  }

  async createFolder(name: string, parentId?: string) {
    const resolvedParentId = parentId || ROOT_FOLDER_ID;
    const parent = await this.folderRepo.findOne({ where: { id: resolvedParentId } });
    if (!parent) throw new NotFoundException('Parent folder not found');
    if (parent.isDeleted) throw new BadRequestException('Parent folder is deleted');

    const folder = this.folderRepo.create({
      name: name.trim(),
      parentId: resolvedParentId,
      isDeleted: false,
    });
    return this.folderRepo.save(folder);
  }

  async renameFolder(id: string, name: string) {
    const folder = await this.getFolder(id);
    folder.name = name.trim();
    return this.folderRepo.save(folder);
  }

  async moveFolder(id: string, newParentId: string) {
    if (id === ROOT_FOLDER_ID) throw new BadRequestException('Root folder cannot be moved');
    const folder = await this.getFolder(id);
    const parent = await this.getFolder(newParentId);
    if (parent.isDeleted) throw new BadRequestException('Target parent is deleted');
    if (id === newParentId) throw new BadRequestException('Cannot move folder under itself');
    folder.parentId = parent.id;
    return this.folderRepo.save(folder);
  }

  async softDeleteFolder(id: string) {
    if (id === ROOT_FOLDER_ID) throw new BadRequestException('Root folder cannot be deleted');
    const folder = await this.getFolder(id);
    folder.isDeleted = true;
    return this.folderRepo.save(folder);
  }

  async restoreFolder(id: string) {
    const folder = await this.getFolder(id);
    folder.isDeleted = false;
    return this.folderRepo.save(folder);
  }
}

