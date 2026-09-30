#!/bin/sh
# fills in the discord webhook from an env var at startup so the secret never lives in git or in the image
set -e
sed "s|__DISCORD_WEBHOOK_URL__|${DISCORD_WEBHOOK_URL}|" /etc/alertmanager/alertmanager.tmpl.yml > /tmp/alertmanager.yml
exec /bin/alertmanager --config.file=/tmp/alertmanager.yml --storage.path=/tmp/alertmanager-data
