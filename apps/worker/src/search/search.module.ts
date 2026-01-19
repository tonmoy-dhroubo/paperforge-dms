import { Module } from '@nestjs/common';
import { ElasticsearchService } from './elasticsearch.service';
import { SearchIndexerService } from './search-indexer.service';
import { SearchConsumer } from './search.consumer';

@Module({
  providers: [ElasticsearchService, SearchIndexerService, SearchConsumer],
  exports: [SearchConsumer],
})
export class SearchModule {}

