#!/usr/bin/env bash
# automated incident simulation (only runs when the SIMULATE_INCIDENT box is ticked)
# 1. fire the suspicious access burst at production
# 2. wait until alertmanager has the SuspiciousAccessDenials alert
# 3. pass = alerting works end to end (discord gets pinged by alertmanager itself)
set -euo pipefail
AM="${ALERTMANAGER_URL:-http://alertmanager:9093}"
node scripts/simulate-incident.mjs --base-url "${PROD_URL}" --attempts 40

echo "[drill] waiting for alertmanager to receive SuspiciousAccessDenials (max 3 min)"
for i in $(seq 1 36); do
  if curl -fsS "${AM}/api/v2/alerts" | jq -e '.[] | select(.labels.alertname=="SuspiciousAccessDenials")' > /dev/null; then
    echo "[drill] ALERT FIRED after ~$((i * 5))s. check the discord channel"
    curl -fsS "${AM}/api/v2/alerts" | jq '.[] | {alert: .labels.alertname, severity: .labels.severity, summary: .annotations.summary}'
    exit 0
  fi
  sleep 5
done
echo "[drill] alert never fired, alerting pipeline is broken"
exit 1
