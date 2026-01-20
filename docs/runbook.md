# Paperforge Phase-1 Runbook

## Services

- API: NestJS (`apps/api`)
- Worker: OCR + search indexer (`apps/worker`)
- Web: Next.js (`apps/web`)
- Postgres: system of record
- MinIO: object storage
- Kafka (Redpanda): async pipeline
- Elasticsearch: full-text search

## Start / Stop (dev)

```bash
npm run dev:up
npm run dev:down
```

## Demo Data Seeding

Seed demo folders + PDFs (uploads to MinIO and commits versions):

```bash
npm run seed:demo
```

Options:
- Custom API base: `npm run seed:demo -- --api http://localhost:7080/api`
- Wait for OCR completion: `npm run seed:demo -- --wait-ocr`
- If first user is not ADMIN (DB already has users): `npm run seed:demo -- --promote-admin`

Health checks:

```bash
./scripts/dev/check.sh
```

## Critical Env Vars

- `DATABASE_URL`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `AUTH_DEFAULT_ROLE`, `AUTH_FIRST_USER_ADMIN`
- `S3_ENDPOINT`, `S3_PRESIGN_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`
- `KAFKA_BROKERS` + topic names
- `ELASTICSEARCH_URL`, `ELASTICSEARCH_INDEX`

## Backup / Restore

Postgres backup:

```bash
pg_dump -h localhost -p 5433 -U paperforge -d paperforge > /tmp/paperforge.sql
```

Restore:

```bash
psql -h localhost -p 5433 -U paperforge -d paperforge < /tmp/paperforge.sql
```

MinIO objects:

- Use `mc mirror` or S3-compatible tooling to sync `paperforge` bucket

Elasticsearch:

- Rebuild index by replaying `paperforge.search.index` events or running a backfill job (TBD)

## Kafka Topics

- `paperforge.document-version.created`
- `paperforge.ocr.completed`
- `paperforge.ocr.dlq`
- `paperforge.search.index`

## Troubleshooting

API not starting:

- Check DB connectivity and migrations
- Verify `JWT_*` secrets are 32+ chars

Uploads fail:

- Verify MinIO credentials and bucket exists
- Check `S3_PRESIGN_ENDPOINT` is reachable by the browser

OCR stuck in QUEUED:

- Check worker logs and Kafka connectivity
- Verify Tesseract + Poppler installed in worker image

Search returns empty:

- Verify Elasticsearch is healthy
- Confirm search indexer consumer is running
- Check index name matches `ELASTICSEARCH_INDEX`

## Logs (docker)

```bash
docker compose logs -f api
docker compose logs -f worker-ocr
docker compose logs -f web
```
