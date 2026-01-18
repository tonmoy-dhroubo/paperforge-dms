-- Phase-1 / M1 seeds: default roles + minimal permissions catalog

INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'System administrator'),
  ('HR', 'HR department'),
  ('LEGAL', 'Legal department')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('MANAGE_ROLES', 'Create/update roles'),
  ('MANAGE_USERS', 'Create/update users'),
  ('MANAGE_PERMISSIONS', 'Create/update permissions and mappings'),
  ('ACCESS_ALL_FOLDERS', 'Bypass folder grants (admin access)')
ON CONFLICT (name) DO NOTHING;

-- Default: ADMIN can manage roles/users/permissions globally.
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.name IN ('MANAGE_ROLES', 'MANAGE_USERS', 'MANAGE_PERMISSIONS', 'ACCESS_ALL_FOLDERS')
WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;
