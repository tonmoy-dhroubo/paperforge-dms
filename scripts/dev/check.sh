#!/usr/bin/env bash
set -euo pipefail

docker compose ps
echo

retry() {
  local name="$1"
  shift
  local attempts="${1:-30}"
  shift
  local delay="${1:-2}"
  shift

  for _ in $(seq 1 "$attempts"); do
    if "$@" >/dev/null 2>&1; then
      echo "${name}: ready"
      return 0
    fi
    sleep "$delay"
  done

  echo "${name}: not ready"
  return 1
}

docker compose exec -T postgres pg_isready -U "${POSTGRES_USER:-paperforge}" -d "${POSTGRES_DB:-paperforge}"
retry "MinIO" 30 2 curl -fsS "http://localhost:${MINIO_API_PORT:-9000}/minio/health/ready"
retry "Kafka (Redpanda)" 30 2 docker compose exec -T kafka rpk cluster health --api-urls localhost:9644
retry "Elasticsearch" 30 2 curl -fsS "http://localhost:${ELASTICSEARCH_PORT:-9200}/_cluster/health?wait_for_status=yellow&timeout=30s"
