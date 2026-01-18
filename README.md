# Paperforge DMS

Phase-1 MVP: internal DMS with nested folders, PDF uploads + versioning, async OCR (Kafka + Tesseract), and full‑text search (Elasticsearch), with strict role-based authorization.

## Dev (M0)

Start infrastructure (Postgres, MinIO, Kafka, Elasticsearch):

```bash
docker compose up -d
docker compose ps
```

Defaults are in `.env.example`. Create a local `.env` to override.

Quick checks:

```bash
./scripts/dev/check.sh
```

## API (M1)

Install deps:

```bash
npm install
```

Start infra and run the API:

```bash
docker compose up -d postgres
npm run api:dev
```

Endpoints:

- `GET http://localhost:7080/api/health`
- `POST http://localhost:7080/api/auth/register`
- `POST http://localhost:7080/api/auth/login`
- `POST http://localhost:7080/api/auth/refresh`
- `GET http://localhost:7080/api/auth/me` (Bearer token)
- `GET http://localhost:7080/api/roles` (Bearer token)
- `POST http://localhost:7080/api/roles` (`MANAGE_ROLES`)
- `PUT http://localhost:7080/api/users/:id/roles` (`MANAGE_USERS`)
- `GET http://localhost:7080/api/permissions` (Bearer token)
- `POST http://localhost:7080/api/permissions` (`MANAGE_PERMISSIONS`)
- `PUT http://localhost:7080/api/roles/:roleName/permissions` (`MANAGE_PERMISSIONS`)
- `PUT http://localhost:7080/api/roles/:roleName/operational/:operationalRole/permissions` (`MANAGE_PERMISSIONS`)

Folder APIs (all require Bearer token):

- `GET http://localhost:7080/api/folders/root`
- `GET http://localhost:7080/api/folders/:id`
- `GET http://localhost:7080/api/folders/:id/children`
- `POST http://localhost:7080/api/folders` (requires `FOLDER_CREATE` on parent)
- `PATCH http://localhost:7080/api/folders/:id` (requires `FOLDER_RENAME`)
- `POST http://localhost:7080/api/folders/:id/move` (requires `FOLDER_MOVE` + `FOLDER_CREATE` on target)
- `DELETE http://localhost:7080/api/folders/:id` (requires `FOLDER_DELETE`)
- `POST http://localhost:7080/api/folders/:id/restore` (requires `FOLDER_RESTORE`)
- `PUT http://localhost:7080/api/folders/:id/grants` (requires `GRANTS_MANAGE`)
- `GET http://localhost:7080/api/folders/:id/grants/explicit` (requires `GRANTS_MANAGE`)
- `GET http://localhost:7080/api/folders/:id/grants/effective` (requires `FOLDER_READ`)
- `GET http://localhost:7080/api/folders/:id/access` (debug effective permissions)

Document APIs (all require Bearer token):

- `POST http://localhost:7080/api/documents` (requires `DOC_UPLOAD` on folder; returns presigned upload URL for v1)
- `POST http://localhost:7080/api/documents/:id/versions` (requires `DOC_UPLOAD`; returns presigned upload URL for next version)
- `POST http://localhost:7080/api/documents/versions/commit` (requires `DOC_UPLOAD`; marks version uploaded after HEAD)
- `GET http://localhost:7080/api/documents/:id` (requires `DOC_READ`)
- `GET http://localhost:7080/api/documents/:id/versions` (requires `DOC_READ`)
- `GET http://localhost:7080/api/documents/versions/:versionId/download-url` (requires `DOC_READ`; returns presigned download URL)
- `DELETE http://localhost:7080/api/documents/:id` (requires `DOC_DELETE`)
- `POST http://localhost:7080/api/documents/:id/restore` (requires `DOC_RESTORE`)

### Useful URLs

- Postgres: `localhost:5433` (override via `POSTGRES_PORT`)
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Kafka (Redpanda): `localhost:9094`
- Elasticsearch: `http://localhost:9200`

## Repo Layout (planned)

- `apps/api`: NestJS API (auth, folders, documents, permissions, search)
- `apps/worker`: NestJS workers (OCR + Elasticsearch indexing)
- `apps/web`: NextJS app
- `libs/`: shared libraries
- `db/`: Postgres init scripts (dev)
- `scripts/`: developer scripts
