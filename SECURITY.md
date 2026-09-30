# Security findings and how they were handled

The Security stage runs three scanners in parallel. The first run on the original code failed the build.
This file is the record of what was found, how bad it was, and what I did about it.

## Gate policy

| Blocks the build | Reported only |
|---|---|
| Semgrep ERROR findings (custom MedVault rules) | Semgrep WARNING + OWASP Top 10 registry rules |
| npm audit HIGH / CRITICAL | MEDIUM / LOW |
| Trivy HIGH / CRITICAL with a fix available | vulns with no fix yet (`--ignore-unfixed`) |
| Trivy Dockerfile misconfig HIGH / CRITICAL | LOW misconfigs |
| Any secret found in the repo | |

Accepted risks go in `.trivyignore` with a reason and an expiry date, so they get looked at again.

## Findings from the first scan

| # | Finding | Tool | Severity | Fix |
|---|---|---|---|---|
| 1 | Hard-coded `express-session` secret (CWE-798). Anyone with the code can forge a session cookie for any role | Semgrep custom rule | High (blocking) | Secret now comes from the `SESSION_SECRET` env var, injected from a Jenkins credential. Staging/prod refuse to start without one (`server/config.js`) |
| 2 | CORS reflected ANY origin with credentials (CWE-942). A malicious site could read patient data using a logged-in clinician's cookie | Semgrep custom rule | High (blocking) | Origin allow-list per environment (`CORS_ORIGINS` in `config/*.env`) |
| 3 | No security headers (CWE-693): no CSP, clickjacking possible, `X-Powered-By: Express` leaked | Semgrep custom rule | High (blocking) | `helmet` with a strict CSP (`script-src 'self'`, `frame-ancestors 'none'`) |
| 4 | DOM XSS: the treatment context typed at login was put into the page with `innerHTML` (CWE-79) | Semgrep custom rule | High (blocking) | Rendered with `textContent` / `escapeHtml()`. Inline `onclick` handlers also removed so the CSP can block inline JS |
| 5 | Deny-list authorization: the field endpoint checked `deniedFields`, so a field nobody listed was readable (CWE-285) | Semgrep custom rule | Medium (warning) | Now checks `allowedFields` (deny by default). Regression test adds a new field and proves it's denied |
| 6 | Container runs as root (Trivy DS002) | Trivy config | High (blocking) | `USER node` in the Dockerfile, plus `read_only`, `cap_drop: ALL` and `no-new-privileges` in compose |
| 7 | npm/yarn shipped inside the runtime image, with their own vulnerable deps | Trivy image | depends on the day's CVE feed | Multi-stage build, npm/yarn deleted from the final image, `apk upgrade` for OS patches |
| 8 | `@faker-js/faker` <= 10.4.0: `helpers.fake` can be abused for arbitrary code execution (GHSA-qxc2-j82w-r537) | npm audit + Trivy | High (blocking) | Upgraded faker 8 to 10.6.0 (major version, checked by the full test suite). We never pass user input to `helpers.fake`, but patched anyway |
| 9 | `qs` 2.2.5 to 6.15.3: DoS + array-limit bypass (GHSA-q8mj-m7cp-5q26, GHSA-x5fp-wj9c-mxmx, GHSA-4mjr-xmp4-gh2g), pulled in by Express | npm audit | Moderate | Express pins an older qs, so an npm `overrides` entry forces the patched qs 6.16.0 |
| 10 | `body-parser` < 1.20.6: size limit can be silently disabled (GHSA-v422-hmwv-36x6) | npm audit | Low | `npm audit fix` updated it to 1.20.8 |
| 11 | `brace-expansion` + `ip-address` CVEs (e.g. CVE-2026-102276, CVE-2026-69192) inside the image | Trivy image | High | Both only came from the npm CLI bundled in `node:22-alpine`. Deleting npm from the runtime image (finding 7) removed them |

Extra hardening done at the same time (not flagged by a scanner, found while fixing the above):

- Login rate limiting (`express-rate-limit`), 429 after too many attempts
- Session cookie is `HttpOnly` + `SameSite=Strict`, renamed from the default `connect.sid`
- JSON body limit of 10kb (413 on anything bigger)

Every fix has a regression test in `tests/integration/security.test.js`, so undoing one breaks the Test stage.

## Known / accepted risks

| Risk | Why it's accepted | Mitigation |
|---|---|---|
| Login is role-picker only, no password | Hackathon demo with fake (Faker) patient data | Documented as future work: real identity provider / SSO + MFA |
| `/metrics` is public | Only reachable on the local Docker network + localhost in this lab | In a real deployment put it behind the internal network or basic auth |
| Cookies not `Secure` | Demo runs on plain http://localhost | Set `SECURE_COOKIES=true` once behind HTTPS |
| Jenkins container runs as root | Needed to use the Docker socket on Docker Desktop | Local lab only. A real setup would use separate build agents |

## Supply chain note

Trivy is pinned to **v0.69.3** and its checksum is verified in `infra/jenkins/Dockerfile`.
In March 2026 the Trivy project was compromised and v0.69.4 was a malicious release
(GHSA-69fq-xp46-6x23), so "just install latest" would have been the wrong call for a security tool.
