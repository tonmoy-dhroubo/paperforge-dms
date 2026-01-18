import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolderAccessService } from '../folders/folder-access.service';
import { Folder } from '../folders/entities/folder.entity';
import { StorageModule } from '../storage/storage.module';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [TypeOrmModule.forFeature([Document, DocumentVersion, Folder]), StorageModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, FolderAccessService],
})
export class DocumentsModule {}

