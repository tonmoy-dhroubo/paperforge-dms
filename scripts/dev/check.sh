#!/usr/bin/env bash
set -euo pipefail

docker compose ps
echo
echo "Postgres:" && docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-paperforge}" -d "${POSTGRES_DB:-paperforge}"
echo "MinIO:" && curl -fsS "http://localhost:${MINIO_API_PORT:-9000}/minio/health/ready" >/dev/null && echo "ready"
echo "Kafka:" && docker compose exec -T kafka kafka-topics --bootstrap-server localhost:9092 --list >/dev/null && echo "ready"
echo "Elasticsearch:" && curl -fsS "http://localhost:${ELASTICSEARCH_PORT:-9200}/_cluster/health" >/dev/null && echo "ready"
