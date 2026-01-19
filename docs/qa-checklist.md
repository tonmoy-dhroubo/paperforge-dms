# Paperforge Phase-1 QA Checklist

Use this checklist before tagging a Phase-1 release or demoing a new build.

## Environment

- [ ] `npm run dev:up` starts all services (api/web/worker/postgres/minio/kafka/elasticsearch)
- [ ] `./scripts/dev/check.sh` returns OK for all health checks
- [ ] Web loads at `http://localhost:3000`
- [ ] API health returns 200 at `http://localhost:7080/api/health`

## Auth + Roles (M1)

- [ ] First registration boots ADMIN when `AUTH_FIRST_USER_ADMIN=true`
- [ ] Login returns access + refresh tokens
- [ ] Refresh rotates tokens and keeps access valid
- [ ] Dynamic role creation works (`POST /api/roles`)
- [ ] User role assignment works (`PUT /api/users/:id/roles`)

## Permissions + Inheritance (M2)

- [ ] Root folder grants allow ADMIN to access everything (`ACCESS_ALL_FOLDERS`)
- [ ] Explicit grants on a folder override ancestor grants
- [ ] Child folder inherits nearest ancestor grants when no explicit grants exist
- [ ] `GET /api/folders/:id/access` shows expected permissions
- [ ] Forbidden actions return 403 for missing permissions

## Folders (M3)

- [ ] Create folder under root, then rename
- [ ] Move folder to another parent
- [ ] Soft delete and restore folder
- [ ] Deleted folders cannot accept uploads

## Documents + Versions (M3)

- [ ] Upload a PDF (v1) via presigned URL + commit
- [ ] Upload a second version (v2) and verify latest pointer changes
- [ ] Download any version via presigned URL
- [ ] Soft delete document and restore

## OCR (M4)

- [ ] OCR status transitions: QUEUED -> PROCESSING -> COMPLETED
- [ ] OCR text persisted per page
- [ ] Retry OCR requeues and completes
- [ ] DLQ capture on failing OCR jobs

## Search (M5)

- [ ] Search hits show highlights for OCR text
- [ ] Folder scoped search works
- [ ] Global search respects latest-versions-by-default
- [ ] `allVersions=true` requires `ACCESS_ALL_FOLDERS`

## Preview (M5)

- [ ] Preview renders latest version
- [ ] Switch versions in preview
- [ ] Jump-to-page from search result

## UI Smoke

- [ ] Login page renders and theme switch works
- [ ] Folder browser loads
- [ ] Upload progress updates
- [ ] Search results render snippets and links

## Regression Scenarios

- [ ] Non-admin role lacks access to protected folder (403 on API + UI shows error)
- [ ] MinIO offline -> upload fails gracefully
- [ ] Elasticsearch offline -> search shows error but app remains usable
- [ ] OCR worker down -> status stuck in QUEUED, retry works after worker recovery
