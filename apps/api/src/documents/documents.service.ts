import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { FolderAccessService } from '../folders/folder-access.service';
import { S3Service } from '../storage/s3.service';
import { KafkaProducerService } from '../events/kafka-producer.service';
import { Document } from './entities/document.entity';
import { DocumentVersion } from './entities/document-version.entity';
import { randomUUID } from 'crypto';
import { DocumentVersionPage } from './entities/document-version-page.entity';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Document) private readonly docRepo: Repository<Document>,
    @InjectRepository(DocumentVersion) private readonly versionRepo: Repository<DocumentVersion>,
    @InjectRepository(DocumentVersionPage) private readonly pageRepo: Repository<DocumentVersionPage>,
    private readonly folderAccess: FolderAccessService,
    private readonly s3: S3Service,
    private readonly kafka: KafkaProducerService,
  ) {}

  async getDocument(id: string) {
    const doc = await this.docRepo.findOne({ where: { id } });
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  private async assertDocPermission(doc: Document, userRoles: string[], permissionName: string) {
    const allowed = await this.folderAccess.userHasFolderPermission(doc.folderId, userRoles, permissionName);
    if (!allowed) throw new ForbiddenException('Insufficient permissions');
  }

  async listDocumentVersions(documentId: string) {
    return this.versionRepo.find({
      where: { documentId },
      order: { versionNumber: 'DESC' },
    });
  }

  async listDocumentsInFolderForRead(user: { sub: string; roles: string[] }, folderId?: string) {
    const fid = (folderId || '').trim();
    if (!fid) throw new BadRequestException('folderId is required');
    await this.folderAccess.assertFolderExists(fid);
    const allowed = await this.folderAccess.userHasFolderPermission(fid, user.roles, 'DOC_READ');
    if (!allowed) throw new ForbiddenException('Insufficient permissions');

    const documents = await this.docRepo.find({
      where: { folderId: fid },
      order: { createdAt: 'DESC' },
      take: 200,
    });

    return {
      folderId: fid,
      documents: documents.map((d) => ({
        id: d.id,
        folderId: d.folderId,
        title: d.title,
        latestVersionId: d.latestVersionId,
        isDeleted: d.isDeleted,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      })),
    };
  }

  async getDocumentForRead(user: { sub: string; roles: string[] }, documentId: string) {
    const doc = await this.getDocument(documentId);
    if (doc.isDeleted) throw new BadRequestException('Document is deleted');
    await this.assertDocPermission(doc, user.roles, 'DOC_READ');
    return doc;
  }

  async listDocumentVersionsForRead(user: { sub: string; roles: string[] }, documentId: string) {
    const doc = await this.getDocumentForRead(user, documentId);
    const versions = await this.listDocumentVersions(doc.id);
    return { documentId: doc.id, latestVersionId: doc.latestVersionId, versions };
  }

  async createDocumentWithUpload(
    user: { sub: string; roles: string[] },
    body: { folderId: string; filename: string; title?: string },
  ) {
    const folderId = body.folderId;
    await this.folderAccess.assertFolderExists(folderId);
    const allowed = await this.folderAccess.userHasFolderPermission(folderId, user.roles, 'DOC_UPLOAD');
    if (!allowed) throw new ForbiddenException('Insufficient permissions');

    return this.dataSource.transaction(async (tx) => {
      const docRepo = tx.getRepository(Document);
      const verRepo = tx.getRepository(DocumentVersion);

      const doc = docRepo.create({
        folderId,
        title: body.title?.trim() || null,
        latestVersionId: null,
        isDeleted: false,
        createdByUserId: user.sub,
      });
      const savedDoc = await docRepo.save(doc);

      const versionNumber = 1;
      const versionId = randomUUID();
      const key = this.buildObjectKey(savedDoc.id, versionNumber, versionId, body.filename);

      const version = verRepo.create({
        id: versionId,
        documentId: savedDoc.id,
        versionNumber,
        originalFilename: body.filename.trim(),
        storageBucket: this.s3.getBucket(),
        storageKey: key,
        contentType: 'application/pdf',
        sizeBytes: null,
        uploadStatus: 'PENDING_UPLOAD',
        uploadedAt: null,
        uploaderUserId: user.sub,
        pageCount: null,
        ocrStatus: 'NOT_STARTED',
        ocrAttempts: 0,
      });
      await verRepo.save(version);

      const presign = await this.s3.presignUpload(key, 'application/pdf');
      return {
        document: savedDoc,
        version: { id: version.id, versionNumber: version.versionNumber, uploadStatus: version.uploadStatus },
        upload: presign,
      };
    });
  }

  async createNewVersionUpload(user: { sub: string; roles: string[] }, documentId: string, filename: string) {
    const doc = await this.getDocument(documentId);
    if (doc.isDeleted) throw new BadRequestException('Document is deleted');
    await this.assertDocPermission(doc, user.roles, 'DOC_UPLOAD');

    return this.dataSource.transaction(async (tx) => {
      const verRepo = tx.getRepository(DocumentVersion);

      const latest = await verRepo.findOne({
        where: { documentId: doc.id },
        order: { versionNumber: 'DESC' },
      });
      const versionNumber = (latest?.versionNumber || 0) + 1;
      const versionId = randomUUID();
      const key = this.buildObjectKey(doc.id, versionNumber, versionId, filename);

      const version = verRepo.create({
        id: versionId,
        documentId: doc.id,
        versionNumber,
        originalFilename: filename.trim(),
        storageBucket: this.s3.getBucket(),
        storageKey: key,
        contentType: 'application/pdf',
        sizeBytes: null,
        uploadStatus: 'PENDING_UPLOAD',
        uploadedAt: null,
        uploaderUserId: user.sub,
        pageCount: null,
        ocrStatus: 'NOT_STARTED',
        ocrAttempts: 0,
      });
      await verRepo.save(version);

      const presign = await this.s3.presignUpload(key, 'application/pdf');
      return {
        documentId: doc.id,
        version: { id: version.id, versionNumber: version.versionNumber, uploadStatus: version.uploadStatus },
        upload: presign,
      };
    });
  }

  async commitVersionUpload(user: { sub: string; roles: string[] }, versionId: string) {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');

    const doc = await this.getDocument(version.documentId);
    await this.assertDocPermission(doc, user.roles, 'DOC_UPLOAD');

    if (version.uploadStatus === 'UPLOADED') {
      return {
        versionId: version.id,
        uploadStatus: version.uploadStatus,
        sizeBytes: version.sizeBytes,
        ocrStatus: version.ocrStatus,
      };
    }

    const head = await this.s3.headObject(version.storageKey);
    if (!head.contentLength) throw new BadRequestException('Uploaded object not found');

    version.uploadStatus = 'UPLOADED';
    version.uploadedAt = new Date();
    version.sizeBytes = String(head.contentLength);
    if (head.contentType) version.contentType = head.contentType;
    version.ocrStatus = 'PENDING';
    version.ocrError = null;
    version.ocrStartedAt = null;
    version.ocrCompletedAt = null;
    await this.versionRepo.save(version);

    doc.latestVersionId = version.id;
    await this.docRepo.save(doc);

    const topic = process.env.KAFKA_TOPIC_VERSION_CREATED || 'paperforge.document-version.created';
    let ocrEnqueued = false;
    let ocrEnqueueError: string | null = null;
    try {
      await this.kafka.publish(topic, { versionId: version.id, documentId: doc.id, folderId: doc.folderId });
      ocrEnqueued = true;
    } catch (err: any) {
      const msg = err?.message ? String(err.message) : String(err);
      ocrEnqueueError = msg;
      version.ocrStatus = 'FAILED';
      version.ocrError = `enqueue_failed: ${msg}`;
      await this.versionRepo.save(version);
    }

    return {
      documentId: doc.id,
      latestVersionId: doc.latestVersionId,
      versionId: version.id,
      versionNumber: version.versionNumber,
      uploadStatus: version.uploadStatus,
      sizeBytes: version.sizeBytes,
      ocrStatus: version.ocrStatus,
      ocrEnqueued,
      ocrEnqueueError,
    };
  }

  async getOcrStatus(user: { sub: string; roles: string[] }, versionId: string) {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    const doc = await this.getDocument(version.documentId);
    if (doc.isDeleted) throw new BadRequestException('Document is deleted');
    await this.assertDocPermission(doc, user.roles, 'DOC_READ');

    return {
      versionId: version.id,
      documentId: doc.id,
      folderId: doc.folderId,
      uploadStatus: version.uploadStatus,
      pageCount: version.pageCount,
      ocrStatus: version.ocrStatus,
      ocrAttempts: version.ocrAttempts,
      ocrStartedAt: version.ocrStartedAt,
      ocrCompletedAt: version.ocrCompletedAt,
      ocrError: version.ocrError,
    };
  }

  async listOcrPages(
    user: { sub: string; roles: string[] },
    versionId: string,
    fromPage?: number,
    toPage?: number,
  ) {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    const doc = await this.getDocument(version.documentId);
    if (doc.isDeleted) throw new BadRequestException('Document is deleted');
    await this.assertDocPermission(doc, user.roles, 'DOC_READ');

    const where: any = { versionId };
    if (typeof fromPage === 'number' || typeof toPage === 'number') {
      const start = typeof fromPage === 'number' ? fromPage : 1;
      const end = typeof toPage === 'number' ? toPage : start;
      if (start <= 0 || end <= 0) throw new BadRequestException('from/to must be positive');
      if (end < start) throw new BadRequestException('to must be >= from');

      const pages = await this.pageRepo
        .createQueryBuilder('p')
        .where('p.versionId = :versionId', { versionId })
        .andWhere('p.pageNumber BETWEEN :start AND :end', { start, end })
        .orderBy('p.pageNumber', 'ASC')
        .getMany();

      return { versionId, from: start, to: end, pages };
    }

    const pages = await this.pageRepo.find({ where, order: { pageNumber: 'ASC' } });
    return { versionId, pages };
  }

  async retryOcr(user: { sub: string; roles: string[] }, versionId: string) {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');
    const doc = await this.getDocument(version.documentId);
    if (doc.isDeleted) throw new BadRequestException('Document is deleted');
    await this.assertDocPermission(doc, user.roles, 'DOC_UPLOAD');

    if (version.uploadStatus !== 'UPLOADED') throw new BadRequestException('Version not uploaded');

    version.ocrStatus = 'PENDING';
    version.ocrError = null;
    version.ocrStartedAt = null;
    version.ocrCompletedAt = null;
    await this.versionRepo.save(version);

    const topic = process.env.KAFKA_TOPIC_VERSION_CREATED || 'paperforge.document-version.created';
    await this.kafka.publish(topic, { versionId: version.id, documentId: doc.id, folderId: doc.folderId });

    return { versionId: version.id, ocrStatus: version.ocrStatus, enqueued: true };
  }

  async getDownloadUrl(user: { sub: string; roles: string[] }, versionId: string) {
    const version = await this.versionRepo.findOne({ where: { id: versionId } });
    if (!version) throw new NotFoundException('Version not found');

    const doc = await this.getDocument(version.documentId);
    if (doc.isDeleted) throw new BadRequestException('Document is deleted');

    await this.assertDocPermission(doc, user.roles, 'DOC_READ');

    if (version.uploadStatus !== 'UPLOADED') throw new BadRequestException('Version not uploaded');

    return this.s3.presignDownload(version.storageKey);
  }

  async softDeleteDocument(user: { sub: string; roles: string[] }, documentId: string) {
    const doc = await this.getDocument(documentId);
    await this.assertDocPermission(doc, user.roles, 'DOC_DELETE');
    doc.isDeleted = true;
    return this.docRepo.save(doc);
  }

  async restoreDocument(user: { sub: string; roles: string[] }, documentId: string) {
    const doc = await this.getDocument(documentId);
    await this.assertDocPermission(doc, user.roles, 'DOC_RESTORE');
    doc.isDeleted = false;
    return this.docRepo.save(doc);
  }

  private buildObjectKey(documentId: string, versionNumber: number, versionId: string, filename: string) {
    const safe = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    return `documents/${documentId}/v${versionNumber}/${versionId}-${safe}`;
  }
}
