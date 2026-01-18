-- Phase-1 / M2: folders + folder grants + operational-role permission matrix

CREATE TABLE IF NOT EXISTS folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid NULL REFERENCES folders(id) ON DELETE RESTRICT,
  is_deleted boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT folders_name_not_empty CHECK (length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

CREATE TABLE IF NOT EXISTS folder_role_grants (
  folder_id uuid NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  operational_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (folder_id, role_id, operational_role),
  CONSTRAINT folder_role_grants_operational_role CHECK (operational_role IN ('OWNER', 'VIEWER'))
);

CREATE TABLE IF NOT EXISTS operational_role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  operational_role text NOT NULL,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (role_id, operational_role, permission_id),
  CONSTRAINT operational_role_permissions_operational_role CHECK (operational_role IN ('OWNER', 'VIEWER'))
);

