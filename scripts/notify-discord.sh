#!/usr/bin/env bash
# Post a pipeline message to the team Discord channel.
#   usage: scripts/notify-discord.sh <success|failure|info> "<message>"
set -euo pipefail
STATUS="${1:-info}"
MESSAGE="${2:-}"
if [ -z "${DISCORD_WEBHOOK_URL:-}" ]; then
  echo "[notify] DISCORD_WEBHOOK_URL not set, skipping"
  exit 0
fi
case "${STATUS}" in
  success) COLOR=3066993 ;;   # green
  failure) COLOR=15158332 ;;  # red
  *)       COLOR=3447003 ;;   # blue
esac
jq -n --arg title "Jenkins: ${JOB_NAME:-medvault} #${BUILD_NUMBER:-?} ${STATUS^^}" \
      --arg desc "${MESSAGE}" --arg url "${BUILD_URL:-}" --argjson color "${COLOR}" \
  '{username: "Jenkins", embeds: [{title: $title, description: $desc, url: $url, color: $color}]}' \
| curl -fsS -H "Content-Type: application/json" -d @- "${DISCORD_WEBHOOK_URL}" > /dev/null
echo "[notify] sent ${STATUS} message to Discord"
