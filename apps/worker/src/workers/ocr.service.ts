import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { DocumentVersion } from '../entities/document-version.entity';
import { S3Service } from '../storage/s3.service';
import { OcrRunner } from './ocr.runner';
import { OcrPage } from './ocr.page.entity';
import { createWriteStream } from 'fs';
import { mkdir, rm } from 'fs/promises';
import { pipeline } from 'stream/promises';

@Injectable()
export class OcrService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(DocumentVersion) private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(OcrPage) private readonly pageRepo: Repository<OcrPage>,
    private readonly s3: S3Service,
    private readonly runner: OcrRunner,
  ) {}

  async processVersion(versionId: string) {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) {
      return { status: 'SKIP', reason: 'version_not_found' };
    }

    if (version.uploadStatus !== 'UPLOADED') {
      return { status: 'SKIP', reason: 'not_uploaded' };
    }

    if (version.ocrStatus === 'COMPLETED') {
      return { status: 'SKIP', reason: 'already_completed' };
    }

    // Try to claim processing (idempotent / concurrent-safe)
    const claimed = await this.dataSource.query(
      `
      UPDATE document_versions
      SET ocr_status = 'PROCESSING',
          ocr_started_at = COALESCE(ocr_started_at, now()),
          ocr_attempts = ocr_attempts + 1,
          ocr_error = NULL
      WHERE id = $1
        AND ocr_status IN ('NOT_STARTED','PENDING','FAILED')
      RETURNING id
      `,
      [versionId],
    );
    if (!claimed || claimed.length === 0) {
      return { status: 'SKIP', reason: 'not_claimed' };
    }

    const workDir = `/tmp/paperforge-ocr/${versionId}`;
    await mkdir(workDir, { recursive: true });
    const pdfPath = `${workDir}/input.pdf`;

    try {
      await this.downloadPdf(version.storageKey, pdfPath);

      // Detect text vs scanned using first pages.
      const sample = await this.runner.pdfToTextSample(pdfPath, 3);
      // If pdftotext produces any meaningful text, treat it as a text-PDF and skip Tesseract.
      // Scanned/image PDFs typically produce ~0 chars.
      const isTextPdf = sample.charCount >= 10;
      const pageCount = (await this.runner.pdfPageCount(pdfPath)) || 1;

      if (isTextPdf) {
        const text = await this.runner.pdfToText(pdfPath);
        await this.persistPages(versionId, text);
      } else {
        const outPrefix = `${workDir}/page`;
        await this.runner.renderPagesToPng(pdfPath, outPrefix, 1, pageCount);

        const pages: Array<{ page: number; text: string }> = [];
        for (let page = 1; page <= pageCount; page++) {
          const pngPath = `${outPrefix}-${page}.png`;
          const text = await this.runner.tesseractPngToText(pngPath);
          pages.push({ page, text });
        }

        await this.pageRepo.delete({ versionId });
        await this.pageRepo.save(
          pages.map((p) => ({
            versionId,
            pageNumber: p.page,
            text: p.text,
          })),
        );
      }

      await this.dataSource.query(
        `
        UPDATE document_versions
        SET ocr_status = 'COMPLETED',
            ocr_completed_at = now(),
            ocr_error = NULL,
            page_count = COALESCE(page_count, $2)
        WHERE id = $1
        `,
        [versionId, pageCount],
      );

      return { status: 'OK' };
    } catch (error: any) {
      const message = error?.message ? String(error.message) : 'OCR failed';
      await this.dataSource.query(
        `
        UPDATE document_versions
        SET ocr_status = 'FAILED',
            ocr_error = $2
        WHERE id = $1
        `,
        [versionId, message],
      );
      throw error;
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => null);
    }
  }

  private async persistPages(versionId: string, text: string) {
    const pages = text.split('\f');
    await this.pageRepo.delete({ versionId });
    await this.pageRepo.save(
      pages
        .map((t, idx) => ({ versionId, pageNumber: idx + 1, text: t.trim() }))
        .filter((p) => p.text.length > 0),
    );
  }

  private async downloadPdf(key: string, outPath: string) {
    const body = await this.s3.getObjectStream(key);
    const fileStream = createWriteStream(outPath);
    await pipeline(body, fileStream);
  }
}
