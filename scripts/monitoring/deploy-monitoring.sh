#!/usr/bin/env bash
# (re)deploys prometheus + alertmanager + grafana + blackbox from monitoring/ (monitoring as code)
# configs are baked into the images, so any change to a rule or dashboard ships with the next build
set -euo pipefail
: "${DISCORD_WEBHOOK_URL:?need the discord-webhook credential}"
: "${GRAFANA_PASSWORD:?need the grafana-admin credential}"
docker compose -p monitoring -f monitoring/docker-compose.yml up -d --build --remove-orphans
docker compose -p monitoring -f monitoring/docker-compose.yml ps
