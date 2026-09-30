#!/usr/bin/env bash
# Manually (or from Jenkins on smoke-test failure) put the previous image back.
#   usage: scripts/rollback.sh <staging|production>
set -euo pipefail
ENVIRONMENT="${1:?usage: rollback.sh <staging|production>}"
REGISTRY="${REGISTRY:-localhost:5000}"

if ! docker image inspect "${REGISTRY}/medvault:${ENVIRONMENT}-previous" > /dev/null 2>&1; then
  echo "[rollback] no previous ${ENVIRONMENT} image to roll back to"
  exit 1
fi
echo "[rollback] restoring previous ${ENVIRONMENT} image"
APP_ENV="${ENVIRONMENT}" IMAGE_TAG="${ENVIRONMENT}-previous" REGISTRY="${REGISTRY}" \
  docker compose -p "medvault-${ENVIRONMENT}" --env-file "config/${ENVIRONMENT}.env" \
    -f deploy/docker-compose.yml up -d
sleep 5
curl -fsS "http://medvault-${ENVIRONMENT}:3000/health" | jq .
