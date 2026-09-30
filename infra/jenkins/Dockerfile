# jenkins with every tool the pipeline needs baked in, so a fresh machine is one command away
FROM jenkins/jenkins:lts-jdk21

USER root
RUN apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg jq git python3 python3-venv \
    && rm -rf /var/lib/apt/lists/*

# docker CLI + compose plugin (talks to Docker Desktop through the mounted socket)
RUN install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin docker-buildx-plugin \
 && rm -rf /var/lib/apt/lists/*

# node 22 for npm ci / tests / eslint / sonar scanner
RUN curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
 && apt-get install -y --no-install-recommends nodejs && rm -rf /var/lib/apt/lists/*

# trivy pinned to v0.69.3 on purpose: v0.69.4 was the malicious release in the March 2026
# supply chain attack (GHSA-69fq-xp46-6x23). download + verify the checksum before installing
ARG TRIVY_VERSION=0.69.3
RUN ARCH=$(dpkg --print-architecture) \
 && case "$ARCH" in amd64) T=Linux-64bit ;; arm64) T=Linux-ARM64 ;; *) echo "unsupported $ARCH"; exit 1 ;; esac \
 && cd /tmp \
 && curl -fsSLO https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_${T}.tar.gz \
 && curl -fsSLO https://github.com/aquasecurity/trivy/releases/download/v${TRIVY_VERSION}/trivy_${TRIVY_VERSION}_checksums.txt \
 && grep " trivy_${TRIVY_VERSION}_${T}.tar.gz$" trivy_${TRIVY_VERSION}_checksums.txt | sha256sum -c - \
 && tar -xzf trivy_${TRIVY_VERSION}_${T}.tar.gz -C /usr/local/bin trivy \
 && rm -f /tmp/trivy_* && trivy --version

# semgrep in its own venv, pinned
RUN python3 -m venv /opt/semgrep \
 && /opt/semgrep/bin/pip install --no-cache-dir semgrep==1.178.0 \
 && ln -s /opt/semgrep/bin/semgrep /usr/local/bin/semgrep

USER jenkins
COPY --chown=jenkins:jenkins plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
COPY casc/jenkins.yaml /usr/share/jenkins/casc/jenkins.yaml
