-- Phase-1 / M3 seeds: document permissions and default matrix

INSERT INTO permissions (name, description) VALUES
  ('DOC_READ', 'Read/download/preview documents'),
  ('DOC_UPLOAD', 'Upload document versions'),
  ('DOC_DELETE', 'Soft delete documents'),
  ('DOC_RESTORE', 'Restore soft-deleted documents')
ON CONFLICT (name) DO NOTHING;

-- ADMIN: OWNER and VIEWER can do all doc actions (admin bypass already exists too).
WITH
  role_ids AS (SELECT id, name FROM roles WHERE name = 'ADMIN'),
  perm_ids AS (SELECT id, name FROM permissions WHERE name IN ('DOC_READ','DOC_UPLOAD','DOC_DELETE','DOC_RESTORE'))
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'OWNER', p.id
FROM role_ids r
JOIN perm_ids p ON true
ON CONFLICT DO NOTHING;

WITH
  role_ids AS (SELECT id, name FROM roles WHERE name = 'ADMIN'),
  perm_ids AS (SELECT id, name FROM permissions WHERE name IN ('DOC_READ','DOC_UPLOAD','DOC_DELETE','DOC_RESTORE'))
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'VIEWER', p.id
FROM role_ids r
JOIN perm_ids p ON true
ON CONFLICT DO NOTHING;

-- HR/LEGAL: VIEWER can read; OWNER can read+upload+delete+restore.
WITH
  role_ids AS (SELECT id, name FROM roles WHERE name IN ('HR','LEGAL')),
  perm_ids AS (SELECT id, name FROM permissions WHERE name IN ('DOC_READ'))
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'VIEWER', p.id
FROM role_ids r
JOIN perm_ids p ON true
ON CONFLICT DO NOTHING;

WITH
  role_ids AS (SELECT id, name FROM roles WHERE name IN ('HR','LEGAL')),
  perm_ids AS (SELECT id, name FROM permissions WHERE name IN ('DOC_READ','DOC_UPLOAD','DOC_DELETE','DOC_RESTORE'))
INSERT INTO operational_role_permissions (role_id, operational_role, permission_id)
SELECT r.id, 'OWNER', p.id
FROM role_ids r
JOIN perm_ids p ON true
ON CONFLICT DO NOTHING;

