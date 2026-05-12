#!/usr/bin/env bash
# Smoke test for the knot-shore-portal Docker image.
#
# Builds the image, runs a container in offline mode (no upstream API
# needed; the portal serves bundled fixtures), polls /api/health until
# the server is ready, then exercises four canonical endpoints. The
# container is stopped and removed on exit regardless of outcome.

set -euo pipefail

IMAGE_NAME="knot-shore-portal"
CONTAINER_NAME="knot-shore-portal-smoke"
HOST_PORT="${HOST_PORT:-3000}"
HEALTH_URL="http://localhost:${HOST_PORT}/api/health"
READY_TIMEOUT_SECONDS="${READY_TIMEOUT_SECONDS:-60}"

cleanup() {
  docker stop "${CONTAINER_NAME}" >/dev/null 2>&1 || true
  docker rm "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

echo "==> Building image: ${IMAGE_NAME}"
docker build -t "${IMAGE_NAME}" .

echo
echo "==> Image size"
docker images "${IMAGE_NAME}" --format "{{.Repository}}:{{.Tag}} {{.Size}}"

# Remove a stale container with the same name before starting.
docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true

echo
echo "==> Starting container on port ${HOST_PORT} in offline mode"
docker run -d \
  --name "${CONTAINER_NAME}" \
  -p "${HOST_PORT}:3000" \
  -e API_MODE=offline \
  "${IMAGE_NAME}" >/dev/null

echo "==> Waiting up to ${READY_TIMEOUT_SECONDS}s for ${HEALTH_URL}"
ready=0
for ((i = 0; i < READY_TIMEOUT_SECONDS; i++)); do
  if curl --silent --fail --max-time 2 "${HEALTH_URL}" >/dev/null 2>&1; then
    ready=1
    echo "    ready after ${i}s"
    break
  fi
  sleep 1
done

if [[ "${ready}" -ne 1 ]]; then
  echo "ERROR: portal did not become ready within ${READY_TIMEOUT_SECONDS}s" >&2
  echo "---- container logs ----" >&2
  docker logs "${CONTAINER_NAME}" >&2 || true
  exit 1
fi

# A single endpoint check: prints the result, increments a counter on
# failure. Curl returns the HTTP status to stdout; we surface a brief
# body preview for visibility.
fail_count=0

check_endpoint() {
  local label="$1"
  local path="$2"

  local url="http://localhost:${HOST_PORT}${path}"
  local body status
  body="$(curl --silent --max-time 5 --output /dev/stdout --write-out '\n__STATUS__:%{http_code}' "${url}" || true)"
  status="${body##*__STATUS__:}"
  body="${body%__STATUS__:*}"

  if [[ "${status}" != "200" ]]; then
    echo "  [FAIL] ${label} ${path} -> ${status}"
    echo "         body: $(printf '%s' "${body}" | head -c 200)"
    fail_count=$((fail_count + 1))
    return
  fi

  local preview
  preview="$(printf '%s' "${body}" | head -c 120 | tr '\n' ' ')"
  echo "  [PASS] ${label} ${path} -> 200 ${preview}"
}

echo
echo "==> Exercising endpoints"
check_endpoint "health        " "/api/health"
check_endpoint "store-metrics " "/api/store-metrics?limit=1"
check_endpoint "anomalies     " "/api/anomalies?limit=1"
check_endpoint "dim-stores    " "/api/dim-stores"

# Verify dim-stores returns exactly 8 stores in offline mode.
echo
echo "==> Verifying dim-stores fixture shape"
store_count="$(curl --silent --max-time 5 "http://localhost:${HOST_PORT}/api/dim-stores" \
  | grep -o '"store_id"' | wc -l | tr -d ' ')"
if [[ "${store_count}" == "8" ]]; then
  echo "  [PASS] dim-stores returned 8 stores"
else
  echo "  [FAIL] dim-stores returned ${store_count} stores, expected 8"
  fail_count=$((fail_count + 1))
fi

echo
if [[ "${fail_count}" -eq 0 ]]; then
  echo "==> SMOKE TEST PASSED"
  exit 0
else
  echo "==> SMOKE TEST FAILED (${fail_count} check(s) failed)" >&2
  echo "---- container logs ----" >&2
  docker logs "${CONTAINER_NAME}" >&2 || true
  exit 1
fi
