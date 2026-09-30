#!/usr/bin/env bash
# Mark a version as released AFTER it is healthy in production:
#   - tag the image as :production and :latest in the registry
#   - create an annotated git tag vX.Y.Z and push it to GitHub
#   - publish a GitHub Release with auto-generated notes
#   - write a release manifest that Jenkins archives
# Needs GH_USER / GH_TOKEN (Jenkins credential "github-pat").
set -euo pipefail

VERSION="${1:?usage: release.sh <version>}"
REGISTRY="${REGISTRY:-localhost:5000}"
REPO="${REGISTRY}/medvault"
TAG="v${VERSION}"
GH_REPO="$(echo "${GIT_URL}" | sed -E 's#^(https://github.com/|git@github.com:)##; s#\.git$##')"

echo "[release] promoting ${REPO}:${VERSION} -> :production"
docker tag "${REPO}:${VERSION}" "${REPO}:production"
docker tag "${REPO}:${VERSION}" "${REPO}:latest"
docker push -q "${REPO}:production"
docker push -q "${REPO}:latest"

echo "[release] tagging ${GIT_COMMIT} as ${TAG} in ${GH_REPO}"
git -c user.name="Jenkins CI" -c user.email="jenkins@medvault.local" \
  tag -a "${TAG}" "${GIT_COMMIT}" -m "MedVault ${TAG} released by Jenkins build #${BUILD_NUMBER}"
set +x
git push "https://${GH_USER}:${GH_TOKEN}@github.com/${GH_REPO}.git" "refs/tags/${TAG}"

echo "[release] creating GitHub release ${TAG}"
BODY="Automated release from Jenkins build #${BUILD_NUMBER}.

- Image: \`${REPO}:${VERSION}\`
- Commit: ${GIT_COMMIT}
- Passed: unit + integration tests, code quality gate, security gate, staging smoke tests, production smoke tests"
jq -n --arg tag "${TAG}" --arg name "MedVault ${TAG}" --arg body "${BODY}" \
  '{tag_name: $tag, name: $name, body: $body, generate_release_notes: true}' > release-request.json
curl -fsS -X POST \
  -H "Authorization: Bearer ${GH_TOKEN}" \
  -H "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${GH_REPO}/releases" \
  -d @release-request.json | jq '{html_url, tag_name, name}' | tee release-response.json

jq -n --arg version "${VERSION}" --arg tag "${TAG}" --arg commit "${GIT_COMMIT}" \
  --arg image "${REPO}:${VERSION}" --arg build "${BUILD_URL}" \
  --arg at "$(date -u +%Y-%m-%dT%H:%M:%SZ)" \
  '{version: $version, gitTag: $tag, commit: $commit, image: $image, jenkinsBuild: $build, releasedAt: $at, environment: "production"}' \
  > "dist/release-${VERSION}.json"
cat "dist/release-${VERSION}.json"
