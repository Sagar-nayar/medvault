#!/usr/bin/env bash
# checks the monitoring is actually watching production, not just running
set -euo pipefail
PROM="${PROMETHEUS_URL:-http://prometheus:9090}"

echo "[monitor] waiting for prometheus to be ready"
for i in $(seq 1 30); do curl -fsS "${PROM}/-/ready" > /dev/null 2>&1 && break; sleep 2; done

query() { curl -fsS --get "${PROM}/api/v1/query" --data-urlencode "query=$1" | jq -r '.data.result[0].value[1] // "0"'; }

echo "[monitor] waiting for prometheus to scrape medvault-production"
for i in $(seq 1 30); do
  UP="$(query 'up{job="medvault-production"}')"
  [ "${UP}" = "1" ] && break
  sleep 3
done
[ "${UP}" = "1" ] || { echo "[monitor] production target is DOWN in prometheus"; exit 1; }
echo "[monitor] production scrape target: UP"

PROBE="$(query 'probe_success{job="blackbox-production"}')"
echo "[monitor] blackbox /health probe success: ${PROBE}"

VERSION="$(curl -fsS --get "${PROM}/api/v1/query" --data-urlencode 'query=medvault_app_info{env="production"}' | jq -r '.data.result[0].metric.version')"
echo "[monitor] prometheus sees production running v${VERSION}"

RULES="$(curl -fsS "${PROM}/api/v1/rules" | jq '[.data.groups[].rules[]] | length')"
echo "[monitor] ${RULES} alert rules loaded"
[ "${RULES}" -gt 0 ] || { echo "[monitor] no alert rules loaded"; exit 1; }

echo "[monitor] alerts currently firing:"
curl -fsS "${PROM}/api/v1/alerts" | jq -r '.data.alerts[] | select(.state=="firing") | "  - \(.labels.alertname) [\(.labels.severity)]"' || true
