import { CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('folder_role_grants')
export class FolderRoleGrant {
  @PrimaryColumn({ name: 'folder_id', type: 'uuid' })
  folderId!: string;

  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @PrimaryColumn({ name: 'operational_role', type: 'text' })
  operationalRole!: 'OWNER' | 'VIEWER';

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
