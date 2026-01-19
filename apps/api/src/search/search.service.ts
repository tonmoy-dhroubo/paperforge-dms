import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { FolderAccessService, ROOT_FOLDER_ID } from '../folders/folder-access.service';
import { ElasticsearchService } from './elasticsearch.service';
import { ConfigService } from '@nestjs/config';

type SearchParams = {
  q: string;
  folderId?: string;
  filename?: string;
  allVersions: boolean;
  from: number;
  size: number;
};

@Injectable()
export class SearchService {
  private readonly indexName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly es: ElasticsearchService,
    private readonly folderAccess: FolderAccessService,
  ) {
    this.indexName = (this.config.get<string>('ELASTICSEARCH_INDEX') || 'paperforge_pages_v1').trim();
  }

  async search(user: { sub: string; roles: string[] }, params: SearchParams) {
    if (!params.folderId) {
      const bypass = await this.folderAccess.userHasGlobalFolderBypass(user.roles);
      if (!bypass) throw new BadRequestException('folderId is required (or user must have ACCESS_ALL_FOLDERS)');
    }

    if (params.folderId) {
      await this.folderAccess.assertFolderExists(params.folderId);
      const allowed = await this.folderAccess.userHasFolderPermission(params.folderId, user.roles, 'DOC_READ');
      if (!allowed) throw new ForbiddenException('Insufficient permissions');
    }

    const head = await this.es.head(`/${this.indexName}`);
    if (head.status === 404) {
      return { tookMs: 0, total: 0, hits: [] as any[] };
    }

    const filter: any[] = [{ term: { isDeleted: false } }];
    if (!params.allVersions) filter.push({ term: { isLatest: true } });
    if (params.folderId) filter.push({ term: { folderId: params.folderId } });
    if (params.filename) filter.push({ term: { filename: params.filename } });

    const body = {
      from: params.from,
      size: params.size,
      query: {
        bool: {
          must: [
            {
              multi_match: {
                query: params.q,
                fields: ['text', 'filenameText'],
                operator: 'and',
              },
            },
          ],
          filter,
        },
      },
      highlight: {
        fields: {
          text: {
            fragment_size: 160,
            number_of_fragments: 3,
            pre_tags: ['<mark>'],
            post_tags: ['</mark>'],
          },
        },
      },
      sort: [{ _score: 'desc' }, { uploadedAt: 'desc' }],
    };

    const res: any = await this.es.postJson(`/${this.indexName}/_search`, body);
    const hits = (res?.hits?.hits || []).map((h: any) => ({
      id: h._id,
      score: h._score,
      documentId: h._source?.documentId,
      versionId: h._source?.versionId,
      folderId: h._source?.folderId,
      filename: h._source?.filename,
      versionNumber: h._source?.versionNumber,
      isLatest: h._source?.isLatest,
      pageNumber: h._source?.pageNumber,
      chunkIndex: h._source?.chunkIndex,
      highlights: h.highlight?.text || [],
    }));

    const total = typeof res?.hits?.total?.value === 'number' ? res.hits.total.value : hits.length;
    return { tookMs: res?.took || 0, total, hits };
  }
}

