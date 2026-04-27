#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

BASE_URL="${PHONEME_NAV_KOKORO_BASE_URL:-http://localhost:8880/}"

echo "[kokoro] Checking ${BASE_URL}/docs"
curl --fail --silent --show-error "${BASE_URL}/docs" >/dev/null
echo "[kokoro] Reachable"
