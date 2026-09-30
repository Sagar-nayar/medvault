#!/usr/bin/env bash
# Trivy (pinned to v0.69.3, see infra/jenkins/Dockerfile for why):
#   1. config  - Dockerfile misconfigurations (e.g. running as root)
#   2. fs      - secrets committed to the repo + vulnerable lockfile packages
#   3. image   - OS + Node packages inside the image we are about to ship
#   4. sbom    - CycloneDX software bill of materials for the image
# Gate: HIGH/CRITICAL findings that have a fix available. Accepted risks live in .trivyignore.
set -uo pipefail
mkdir -p reports/security
IMAGE="${IMAGE:?IMAGE not set}"
COMMON="--ignorefile .trivyignore --skip-dirs node_modules --skip-dirs infra"
status=0

echo "== [trivy] Dockerfile / IaC misconfiguration =="
trivy config ${COMMON} --format json --output reports/security/trivy-config.json . || true
trivy config ${COMMON} --severity HIGH,CRITICAL --exit-code 1 . || status=1

echo "== [trivy] secrets + dependency lockfile =="
trivy fs ${COMMON} --scanners vuln,secret --format json --output reports/security/trivy-fs.json . || true
trivy fs ${COMMON} --scanners vuln,secret --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 . || status=1

echo "== [trivy] container image ${IMAGE} =="
trivy image --ignorefile .trivyignore --format json --output reports/security/trivy-image.json "${IMAGE}" || true
trivy image --ignorefile .trivyignore --severity HIGH,CRITICAL --ignore-unfixed --exit-code 1 "${IMAGE}" || status=1

echo "== [trivy] SBOM =="
trivy image --format cyclonedx --output reports/security/sbom.cdx.json "${IMAGE}" || true

echo "[trivy] gate status ${status} (non-zero = blocking finding)"
exit ${status}
