-- Phase-1 / M2 seeds: root folder + base folder/document/grant permissions + default matrix + root grants

-- Deterministic root id for convenience in early Phase-1.
INSERT INTO folders (id, name, parent_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 'ROOT', NULL)
ON CONFLICT (id) DO NOTHING;

-- Folder / doc permissions (resource-scoped through matrix).
INSERT INTO permissions (name, description) VALUES
  ('FOLDER_READ', 'Read folder tree / metadata'),
  ('FOLDER_CREATE', 'Create child folder'),
  ('FOLDER_RENAME', 'Rename folder'),
  ('FOLDER_MOVE', 'Move folder'),
  ('FOLDER_DELETE', 'Soft delete folder'),
  ('FOLDER_RESTORE', 'Restore folder'),
  ('GRANTS_MANAGE', 'Manage folder role grants')
ON CONFLICT (name) DO NOTHING;

-- Default operational-role matrix:
-- - ADMIN: everything (OWNER and VIEWER)
-- - HR/LEGAL: VIEWER can read; OWNER can read + modify within granted folders
WITH
  role_ids AS (
    SELECT id, name FROM roles WHERE name IN ('ADMIN', 'HR', 'LEGAL')
  ),
  perm_ids AS (
    SELECT id, name FROM permissions WHERE name IN (
      'FOLDER_READ','FOLDER_CREATE','FOLDER_RENAME','FOLDER_MOVE','FOLDER_DELETE','FOLDER_RESTORE','GRANTS_MANAGE'
    )
  )
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'OWNER', p.id
FROM role_ids r
JOIN perm_ids p ON true
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

WITH
  role_ids AS (
    SELECT id, name FROM roles WHERE name IN ('ADMIN', 'HR', 'LEGAL')
  ),
  perm_ids AS (
    SELECT id, name FROM permissions WHERE name IN ('FOLDER_READ')
  )
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'VIEWER', p.id
FROM role_ids r
JOIN perm_ids p ON true
WHERE r.name IN ('ADMIN', 'HR', 'LEGAL')
ON CONFLICT DO NOTHING;

WITH
  role_ids AS (
    SELECT id, name FROM roles WHERE name IN ('HR', 'LEGAL')
  ),
  perm_ids AS (
    SELECT id, name FROM permissions WHERE name IN ('FOLDER_READ','FOLDER_CREATE','FOLDER_RENAME','FOLDER_MOVE')
  )
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'OWNER', p.id
FROM role_ids r
JOIN perm_ids p ON true
ON CONFLICT DO NOTHING;

-- Root grants:
-- - ADMIN OWNER on ROOT
-- - HR VIEWER on ROOT
-- - LEGAL VIEWER on ROOT
INSERT INTO folder_role_grants (folder_id, role_id, operational_role)
SELECT '00000000-0000-0000-0000-000000000001', r.id, 'OWNER'
FROM roles r
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

INSERT INTO folder_role_grants (folder_id, role_id, operational_role)
SELECT '00000000-0000-0000-0000-000000000001', r.id, 'VIEWER'
FROM roles r
WHERE r.name IN ('HR', 'LEGAL')
ON CONFLICT DO NOTHING;

