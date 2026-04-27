#!/usr/bin/env bash
set -euo pipefail

if [[ -f .env ]]; then
    set -a
    source .env
    set +a
fi

mkdir -p logs
LOG_FILE="${LOG_FILE:-logs/backend.log}"
HOST="${PHONEME_NAV_BACKEND_HOST:-0.0.0.0}"
PORT="${PHONEME_NAV_BACKEND_PORT:-8000}"

echo "[backend] Logging to ${LOG_FILE}"
echo "[backend] Serving on ${HOST}:${PORT}"

uv run uvicorn phoneme_navigator.api.app:app --host "${HOST}" --port "${PORT}" --reload 2>&1 | tee -a "${LOG_FILE}"
