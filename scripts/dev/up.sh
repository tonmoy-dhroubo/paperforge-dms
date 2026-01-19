#!/usr/bin/env bash
set -euo pipefail

DOCKER_BUILDKIT=0 COMPOSE_DOCKER_CLI_BUILD=0 docker compose up -d --build
