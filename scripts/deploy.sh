#!/usr/bin/env bash
# Deploy one MedVault environment with automatic rollback.
#   usage: scripts/deploy.sh <staging|production> <image-tag>
# 1. remember the image currently running (tagged <env>-previous)
# 2. start the new image with docker compose + the env-specific config file
# 3. wait for /health to report the new version
# 4. if it never becomes healthy, redeploy the previous image and fail
set -euo pipefail

ENVIRONMENT="${1:?usage: deploy.sh <staging|production> <image-tag>}"
TAG="${2:?usage: deploy.sh <staging|production> <image-tag>}"
REGISTRY="${REGISTRY:-localhost:5000}"
REPO="${REGISTRY}/medvault"
CONTAINER="medvault-${ENVIRONMENT}"
HEALTH_URL="http://${CONTAINER}:3000/health"

compose() {
  APP_ENV="${ENVIRONMENT}" IMAGE_TAG="$1" REGISTRY="${REGISTRY}" \
    docker compose -p "medvault-${ENVIRONMENT}" \
      --env-file "config/${ENVIRONMENT}.env" \
      -f deploy/docker-compose.yml up -d --remove-orphans
}

wait_for_version() {
  local expected="$1"
  for i in $(seq 1 30); do
    body="$(curl -fsS "${HEALTH_URL}" 2>/dev/null || true)"
    version="$(echo "${body}" | jq -r '.version // empty' 2>/dev/null || true)"
    if [ "${version}" = "${expected}" ]; then
      echo "[deploy] ${CONTAINER} healthy on v${version} (after ${i} checks)"
      return 0
    fi
    sleep 2
  done
  return 1
}

# 1. remember what is running now so we can roll back to it
PREVIOUS_IMAGE="$(docker inspect -f '{{.Config.Image}}' "${CONTAINER}" 2>/dev/null || true)"
if [ -n "${PREVIOUS_IMAGE}" ]; then
  PREVIOUS_VERSION="$(docker inspect -f '{{index .Config.Labels "org.opencontainers.image.version"}}' "${CONTAINER}")"
  docker tag "${PREVIOUS_IMAGE}" "${REPO}:${ENVIRONMENT}-previous"
  echo "[deploy] current ${ENVIRONMENT} version: ${PREVIOUS_VERSION} (saved as ${ENVIRONMENT}-previous)"
else
  echo "[deploy] first deployment of ${ENVIRONMENT}"
fi

# 2 + 3. deploy the new version and verify it
echo "[deploy] deploying ${REPO}:${TAG} to ${ENVIRONMENT}"
compose "${TAG}"
if wait_for_version "${TAG}"; then
  echo "${TAG}" > "deploy-${ENVIRONMENT}.version"
  exit 0
fi

# 4. automatic rollback
echo "[deploy] ERROR: ${ENVIRONMENT} did not become healthy on ${TAG}"
docker logs --tail 50 "${CONTAINER}" || true
if [ -n "${PREVIOUS_IMAGE}" ]; then
  echo "[deploy] ROLLING BACK ${ENVIRONMENT} to ${PREVIOUS_VERSION}"
  compose "${ENVIRONMENT}-previous"
  wait_for_version "${PREVIOUS_VERSION}" && echo "[deploy] rollback complete"
fi
exit 1
