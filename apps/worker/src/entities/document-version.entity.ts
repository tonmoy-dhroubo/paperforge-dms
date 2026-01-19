import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column({ name: 'storage_bucket', type: 'text' })
  storageBucket!: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;

  @Column({ name: 'upload_status', type: 'text' })
  uploadStatus!: 'PENDING_UPLOAD' | 'UPLOADED';

  @Column({ name: 'page_count', type: 'int', nullable: true })
  pageCount!: number | null;

  @Column({ name: 'ocr_status', type: 'text' })
  ocrStatus!: string;

  @Column({ name: 'ocr_attempts', type: 'int' })
  ocrAttempts!: number;
}

