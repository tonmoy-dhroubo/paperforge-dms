import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ElasticsearchService } from './elasticsearch.service';

type VersionMeta = {
  versionId: string;
  documentId: string;
  folderId: string;
  originalFilename: string;
  versionNumber: number;
  uploadedAt: string | null;
  pageCount: number | null;
  ocrStatus: string;
  isDeleted: boolean;
  latestVersionId: string | null;
};

type PageRow = { pageNumber: number; text: string };

@Injectable()
export class SearchIndexerService {
  private ensured = false;
  private readonly indexName: string;

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly es: ElasticsearchService,
  ) {
    this.indexName = (this.config.get<string>('ELASTICSEARCH_INDEX') || 'paperforge_pages_v1').trim();
  }

  async indexVersion(versionId: string) {
    const meta = await this.getVersionMeta(versionId);
    if (!meta) return { status: 'SKIP', reason: 'version_not_found' } as const;
    if (meta.isDeleted) return { status: 'SKIP', reason: 'document_deleted' } as const;
    if (meta.ocrStatus !== 'COMPLETED') return { status: 'SKIP', reason: 'ocr_not_completed' } as const;

    const pages = await this.getPages(versionId);
    if (pages.length === 0) return { status: 'SKIP', reason: 'no_pages' } as const;

    await this.ensureIndex();

    await this.es.postJson(`/${this.indexName}/_update_by_query?conflicts=proceed&refresh=true`, {
      script: { lang: 'painless', source: 'ctx._source.isLatest = false' },
      query: { term: { documentId: meta.documentId } },
    });

    const ndjsonLines: string[] = [];
    for (const page of pages) {
      const chunks = chunkText(page.text, 2000, 200);
      for (let i = 0; i < chunks.length; i++) {
        const docId = `${meta.versionId}:${page.pageNumber}:${i}`;
        ndjsonLines.push(JSON.stringify({ index: { _index: this.indexName, _id: docId } }));
        ndjsonLines.push(
          JSON.stringify({
            documentId: meta.documentId,
            versionId: meta.versionId,
            folderId: meta.folderId,
            filename: meta.originalFilename,
            filenameText: meta.originalFilename,
            versionNumber: meta.versionNumber,
            isLatest: meta.latestVersionId === meta.versionId,
            isDeleted: meta.isDeleted,
            pageNumber: page.pageNumber,
            chunkIndex: i,
            uploadedAt: meta.uploadedAt,
            text: chunks[i],
          }),
        );
      }
    }

    const bulkRes = await this.es.postNdjson('/_bulk?refresh=true', `${ndjsonLines.join('\n')}\n`);
    if (bulkRes?.errors) {
      const firstError = bulkRes.items?.find((it: any) => it?.index?.error)?.index?.error;
      throw new Error(`Elasticsearch bulk errors: ${JSON.stringify(firstError || bulkRes)}`);
    }

    return { status: 'OK', indexedChunks: ndjsonLines.length / 2 } as const;
  }

  private async ensureIndex() {
    if (this.ensured) return;
    const head = await this.es.head(`/${this.indexName}`);
    if (!head.ok && head.status !== 404) throw new Error(`Elasticsearch index check failed: ${head.status}`);
    if (head.status === 404) {
      await this.es.putJson(`/${this.indexName}`, {
        settings: {
          number_of_shards: 1,
          number_of_replicas: 0,
        },
        mappings: {
          properties: {
            documentId: { type: 'keyword' },
            versionId: { type: 'keyword' },
            folderId: { type: 'keyword' },
            filename: { type: 'keyword' },
            filenameText: { type: 'text' },
            versionNumber: { type: 'integer' },
            isLatest: { type: 'boolean' },
            isDeleted: { type: 'boolean' },
            pageNumber: { type: 'integer' },
            chunkIndex: { type: 'integer' },
            uploadedAt: { type: 'date' },
            text: { type: 'text' },
          },
        },
      });
    }
    this.ensured = true;
  }

  private async getVersionMeta(versionId: string): Promise<VersionMeta | null> {
    const rows = await this.dataSource.query(
      `
      SELECT
        v.id AS "versionId",
        v.document_id AS "documentId",
        d.folder_id AS "folderId",
        v.original_filename AS "originalFilename",
        v.version_number AS "versionNumber",
        v.uploaded_at AS "uploadedAt",
        v.page_count AS "pageCount",
        v.ocr_status AS "ocrStatus",
        d.is_deleted AS "isDeleted",
        d.latest_version_id AS "latestVersionId"
      FROM document_versions v
      JOIN documents d ON d.id = v.document_id
      WHERE v.id = $1
      LIMIT 1
      `,
      [versionId],
    );
    if (!rows || rows.length === 0) return null;
    return rows[0] as VersionMeta;
  }

  private async getPages(versionId: string): Promise<PageRow[]> {
    const rows = await this.dataSource.query(
      `
      SELECT page_number AS "pageNumber", text
      FROM document_version_pages
      WHERE version_id = $1
      ORDER BY page_number ASC
      `,
      [versionId],
    );
    return (rows || []) as PageRow[];
  }
}

function chunkText(text: string, maxChars: number, overlapChars: number) {
  const normalized = (text || '').trim();
  if (!normalized) return [];

  const chunks: string[] = [];
  let start = 0;
  while (start < normalized.length) {
    const end = Math.min(start + maxChars, normalized.length);
    chunks.push(normalized.slice(start, end));
    if (end >= normalized.length) break;
    start = Math.max(0, end - overlapChars);
  }
  return chunks;
}

