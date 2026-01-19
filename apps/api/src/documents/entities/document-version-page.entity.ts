import { Column, CreateDateColumn, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity('document_version_pages')
@Index(['versionId', 'pageNumber'], { unique: true })
export class DocumentVersionPage {
  @PrimaryColumn({ name: 'version_id', type: 'uuid' })
  versionId!: string;

  @PrimaryColumn({ name: 'page_number', type: 'int' })
  pageNumber!: number;

  @Column({ type: 'text' })
  text!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

