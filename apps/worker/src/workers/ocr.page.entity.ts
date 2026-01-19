import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('document_version_pages')
export class OcrPage {
  @PrimaryColumn({ name: 'version_id', type: 'uuid' })
  versionId!: string;

  @PrimaryColumn({ name: 'page_number', type: 'int' })
  pageNumber!: number;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

