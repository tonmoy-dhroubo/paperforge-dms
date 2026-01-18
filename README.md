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

### Useful URLs

- Postgres: `localhost:5433` (override via `POSTGRES_PORT`)
- MinIO API: `http://localhost:9000`
- MinIO Console: `http://localhost:9001`
- Kafka: `localhost:9094`
- Elasticsearch: `http://localhost:9200`

## Repo Layout (planned)

- `apps/api`: NestJS API (auth, folders, documents, permissions, search)
- `apps/worker`: NestJS workers (OCR + Elasticsearch indexing)
- `apps/web`: NextJS app
- `libs/`: shared libraries
- `db/`: Postgres init scripts (dev)
- `scripts/`: developer scripts
