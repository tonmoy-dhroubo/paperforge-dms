import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('document_versions')
export class DocumentVersion {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Index()
  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'version_number', type: 'int' })
  versionNumber!: number;

  @Column({ name: 'original_filename', type: 'text' })
  originalFilename!: string;

  @Column({ name: 'storage_bucket', type: 'text' })
  storageBucket!: string;

  @Column({ name: 'storage_key', type: 'text' })
  storageKey!: string;

  @Column({ name: 'content_type', type: 'text', default: 'application/pdf' })
  contentType!: string;

  @Column({ name: 'size_bytes', type: 'bigint', nullable: true })
  sizeBytes!: string | null;

  @Column({ name: 'upload_status', type: 'text', default: 'PENDING_UPLOAD' })
  uploadStatus!: 'PENDING_UPLOAD' | 'UPLOADED';

  @Column({ name: 'uploaded_at', type: 'timestamptz', nullable: true })
  uploadedAt!: Date | null;

  @Column({ name: 'uploader_user_id', type: 'uuid', nullable: true })
  uploaderUserId!: string | null;

  @Column({ name: 'page_count', type: 'int', nullable: true })
  pageCount!: number | null;

  @Column({ name: 'ocr_status', type: 'text', default: 'NOT_STARTED' })
  ocrStatus!: string;

  @Column({ name: 'ocr_attempts', type: 'int', default: 0 })
  ocrAttempts!: number;

  @Column({ name: 'ocr_started_at', type: 'timestamptz', nullable: true })
  ocrStartedAt!: Date | null;

  @Column({ name: 'ocr_completed_at', type: 'timestamptz', nullable: true })
  ocrCompletedAt!: Date | null;

  @Column({ name: 'ocr_error', type: 'text', nullable: true })
  ocrError!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
