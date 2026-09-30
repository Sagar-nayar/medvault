#!/usr/bin/env bash
# drops a "release vX" marker on every grafana dashboard so you can see if a deploy changed anything
set -euo pipefail
GRAFANA="${GRAFANA_URL:-http://grafana:3000}"
for i in $(seq 1 20); do curl -fsS "${GRAFANA}/api/health" > /dev/null 2>&1 && break; sleep 3; done
jq -n --arg text "Released v${APP_VERSION} (build #${BUILD_NUMBER}, commit ${GIT_SHORT})" \
      --arg v "v${APP_VERSION}" '{tags: ["release", $v], text: $text}' \
| curl -fsS -u "${GRAFANA_USER}:${GRAFANA_PASSWORD}" -H "Content-Type: application/json" \
    -X POST "${GRAFANA}/api/annotations" -d @- | jq .
