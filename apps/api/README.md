# `apps/api`

NestJS API service for:

- auth + dynamic roles/permissions
- folders, documents, versions
- signed URLs for MinIO
- search API (queries Elasticsearch)

## M1 Status

Implemented:

- `GET /api/health`
- auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`, `GET /api/auth/me`
- roles: `GET /api/roles`, `POST /api/roles` (ADMIN), `PUT /api/users/:id/roles` (ADMIN)

## M2 Status

- permissions: `GET /api/permissions`, `POST /api/permissions` (`MANAGE_PERMISSIONS`)
- permission mappings:
  - global: `GET/PUT /api/roles/:roleName/permissions`
  - operational matrix: `GET/PUT /api/roles/:roleName/operational/:operationalRole/permissions`
- folders:
  - `GET /api/folders/root`, `GET /api/folders/:id`, `GET /api/folders/:id/children`
  - `POST /api/folders` (create child)
  - `PATCH /api/folders/:id` (rename), `POST /api/folders/:id/move` (move)
  - `DELETE /api/folders/:id` (soft delete), `POST /api/folders/:id/restore`
  - grants: `PUT /api/folders/:id/grants`, `GET /api/folders/:id/grants/explicit`, `GET /api/folders/:id/grants/effective`
  - debug: `GET /api/folders/:id/access`
