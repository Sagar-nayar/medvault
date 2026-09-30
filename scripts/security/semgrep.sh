#!/usr/bin/env bash
# SAST: Semgrep with MedVault's own rules (.semgrep/) + the community OWASP Top 10 ruleset.
# Gate: any ERROR-severity finding from the custom rules fails the build.
set -uo pipefail
mkdir -p reports/security
export SEMGREP_SEND_METRICS=off

# 1) full report (custom + OWASP registry rules) for the record, never blocks
semgrep scan --config .semgrep/ --config p/owasp-top-ten \
  --exclude node_modules --exclude tests --exclude coverage \
  --json --output reports/security/semgrep.json --quiet . || true
semgrep scan --config .semgrep/ --config p/owasp-top-ten \
  --exclude node_modules --exclude tests --exclude coverage \
  --sarif --output reports/security/semgrep.sarif --quiet . || true

# 2) the gate: blocking custom rules only
semgrep scan --config .semgrep/ --severity ERROR --error \
  --exclude node_modules --exclude tests --exclude coverage .
status=$?
echo "[semgrep] exit code ${status} (non-zero = blocking finding)"
exit ${status}
