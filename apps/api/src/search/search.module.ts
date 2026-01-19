import { Module } from '@nestjs/common';
import { FolderAccessService } from '../folders/folder-access.service';
import { Folder } from '../folders/entities/folder.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ElasticsearchService } from './elasticsearch.service';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';

@Module({
  imports: [TypeOrmModule.forFeature([Folder])],
  controllers: [SearchController],
  providers: [SearchService, ElasticsearchService, FolderAccessService],
})
export class SearchModule {}

