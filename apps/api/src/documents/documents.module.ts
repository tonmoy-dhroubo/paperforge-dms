import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FolderAccessService } from '../folders/folder-access.service';
import { Folder } from '../folders/entities/folder.entity';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { DocumentVersionPage } from './entities/document-version-page.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Document, DocumentVersion, DocumentVersionPage, Folder]),
    StorageModule,
    EventsModule,
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService, FolderAccessService],
})
export class DocumentsModule {}
