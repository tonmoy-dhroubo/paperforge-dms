## Paperforge DMS — Phase-1 MVP Scope (Planning)

Git remote: `git@github.com:tonmoy-dhroubo/paperforge-dms.git`

Phase-1 goal: a usable internal DMS with nested folders, PDF upload + preview, strict permission-checked access, document versioning, async OCR, and Elasticsearch full-text search.

### Tech (Phase-1)

- Monorepo: `nestjs` (API + workers) + `nextjs` (web)
- PostgreSQL (system of record)
- MinIO (object storage)
- Kafka (async pipeline + retries + DLQ) — local dev uses Redpanda (Kafka-compatible)
- Tesseract (OCR per page)
- Elasticsearch (full-text search + highlights)

### Core DMS (Phase-1)

- User authentication (no OAuth2)
- Folder hierarchy (nested): create/move/rename + soft delete/restore
- Document upload (PDF) to MinIO using signed URLs
- Document model + immutable versioning
- Download/preview any version; latest version by default
- Safety: soft delete everywhere, permission checks everywhere, signed download URLs

### Authorization / Permissions (Phase-1)

Dynamic authorization with admin-manageable roles and permissions (not hardcoded).

- Roles are dynamic (ADMIN/HR/LEGAL are initial defaults, but roles can be created/edited)
- Folder-level access control via role grants only (no user-specific grants)
- Operational roles: `OWNER`, `VIEWER`
- Inheritance rule:
  - A folder inherits the nearest ancestor’s permissions if the folder has no explicit grants.
  - If a folder has explicit grants, that folder uses those grants (no ancestor fallback).
- Central permission matrix maps `(role × operational_role) -> allowed actions` for folder/document operations

### Document & Versioning (Phase-1)

- `Document` = logical entity
- `DocumentVersion` = immutable upload (v1, v2, v3…)
- Latest version pointer
- Minimal metadata: filename, uploader, upload date, page count, OCR status

### OCR (Phase-1)

- Async OCR pipeline (Kafka) triggered by new document version upload
- Detect text-PDF vs scanned
- OCR with Tesseract per page (for scanned PDFs)
- Store extracted text per version per page
- OCR status/progress, retry policy, and dead-letter handling

### Search + Preview (Phase-1)

- Elasticsearch indexing (page/chunk level)
- Full-text search (latest versions by default)
- Highlight snippets
- Filters: folder, filename
- Preview UX: inline PDF preview, version switcher, jump-to-page from search result

---

## Milestones (Phase-1)

- M0: Monorepo scaffold + Docker Compose (Postgres/MinIO/Kafka/Elasticsearch)
- M1: Auth + dynamic roles (no OAuth2), admin bootstrap
- M2: Authorization engine (role-permission catalog, folder grants, inheritance, matrix enforcement)
- M3: DMS core (folders, documents, versions, signed URLs, preview, soft delete/restore)
- M4: OCR worker (Kafka consumers, per-page OCR, status/retry/DLQ, persist text)
- M5: Search/index worker + UI search (ES mappings, indexing, highlights, jump-to-page)

---

## Reuse Notes (Reference Project)

For auth/permission patterns and shared NestJS utilities, reference:

- `~/projects/apiforge-headless-cms-nestjs/apps/auth` (register/login/refresh, user/role tables, JWT roles claim)
- `~/projects/apiforge-headless-cms-nestjs/libs/common` (`ApiResponse`, exception filter, `JwtAuthGuard`, `DatabaseModule`)

Note: apiforge’s permission service is endpoint/content-type oriented; Paperforge needs folder/document resource permissions, so the model/queries will be largely new (reuse concepts, not schema).

---

## Explicitly Out of Scope (Phase-2+)

- External sharing links
- Workflow states
- Advanced ACLs beyond Phase-1 model
- Tags/custom metadata
- Version diff/compare
- Audit UI
- Virus scanning

---

## Progress / Milestones Achieved

- 2026-01-18: Phase-1 scope agreed to include OCR + Elasticsearch in Phase-1.
- 2026-01-18: Decisions confirmed — grants are role-only; folder inherits ancestor permissions when no explicit grants; PostgreSQL accepted.
- 2026-01-18: Reuse assessment completed for `apiforge-headless-cms-nestjs` (auth, shared libs, gateway pattern).
- 2026-01-18: M0 scaffolding added (repo layout + `docker-compose.yml`, `.env.example`, dev scripts).
- 2026-01-18: M0 validation: infra up with Postgres (5433), MinIO (bucket seeded), Elasticsearch (9200), Kafka via Redpanda (9094) with topics created (document-version, ocr, search).
- 2026-01-18: M1 started: NestJS API scaffolded (`apps/api`) with Postgres-backed auth and dynamic roles.
- 2026-01-18: M1 validation: API builds and smoke-tested endpoints (register/login/refresh/me, list/create roles, assign user roles).
- 2026-01-18: M2 implemented: folder model + explicit role grants, inheritance resolution (nearest ancestor with grants), and central `(role × operational_role) -> permission` matrix.
- 2026-01-18: M2 implemented: global permission management APIs and mapping APIs (`role_permissions`, `operational_role_permissions`).
- 2026-01-18: M2 safety: added global `ACCESS_ALL_FOLDERS` permission (ADMIN by default) to prevent accidental admin lockout when setting explicit grants.
- 2026-01-18: M3 implemented: documents + immutable versions with latest pointer, soft delete/restore, and MinIO (S3-compatible) signed upload/download URLs.
- 2026-01-19: M4 implemented: OCR persistence (`document_version_pages`, timestamps/errors) + OCR worker (Kafka consumer + retries/DLQ) with Poppler/Tesseract in container.
- 2026-01-19: M4 implemented: version commit emits `paperforge.document-version.created`; API exposes OCR status/text (`/ocr`, `/ocr/pages`) + retry endpoint.
- 2026-01-19: M4 validation: end-to-end upload → commit → OCR completes and persists extracted text per page.
- 2026-01-19: M5 implemented (backend): search indexer consumes `paperforge.search.index` and indexes per page/chunk into Elasticsearch with highlights.
- 2026-01-19: M5 implemented (backend): `/api/search` endpoint with folder/filename filters and latest-versions-by-default behavior.
- 2026-01-19: M5 implemented (web): Next.js UI with centralized theming, login, folder browser, upload, search, and preview.
- 2026-01-19: Post-milestone hardening: Phase-1 QA checklist and ops runbook added (`docs/qa-checklist.md`, `docs/runbook.md`).
- 2026-01-19: M5 implemented (web): folder management UI (create/rename/move/delete/restore) + grants view/edit.
- 2026-01-19: M5 implemented (web): document actions (delete/restore, versions list, OCR retry) + upload progress + drag-drop zone.
- 2026-01-19: M5 implemented (web): global search page and top-nav entry.
