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
