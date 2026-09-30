FROM prom/alertmanager:v0.27.0
COPY alertmanager.tmpl.yml /etc/alertmanager/alertmanager.tmpl.yml
COPY entrypoint.sh /entrypoint.sh
USER nobody
ENTRYPOINT ["/bin/sh", "/entrypoint.sh"]
