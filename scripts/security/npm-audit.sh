#!/usr/bin/env bash
# SCA: known vulnerabilities in npm dependencies (production deps only).
# Gate: fail on HIGH or CRITICAL.
set -uo pipefail
mkdir -p reports/security
npm audit --omit=dev --json > reports/security/npm-audit.json
npm audit --omit=dev --audit-level=high
status=$?
echo "[npm-audit] exit code ${status} (non-zero = HIGH/CRITICAL vulnerable dependency found)"
exit ${status}
