-- Phase-1 / M1 seeds: default roles + minimal permissions catalog

INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'System administrator'),
  ('HR', 'HR department'),
  ('LEGAL', 'Legal department')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions (name, description) VALUES
  ('MANAGE_ROLES', 'Create/update roles'),
  ('MANAGE_USERS', 'Create/update users'),
  ('MANAGE_PERMISSIONS', 'Create/update permissions and mappings')
ON CONFLICT (name) DO NOTHING;

