import { Entity, PrimaryColumn } from 'typeorm';

@Entity('operational_role_permissions')
export class OperationalRolePermission {
  @PrimaryColumn({ name: 'role_id', type: 'uuid' })
  roleId!: string;

  @PrimaryColumn({ name: 'operational_role', type: 'text' })
  operationalRole!: 'OWNER' | 'VIEWER';

  @PrimaryColumn({ name: 'permission_id', type: 'uuid' })
  permissionId!: string;
}

