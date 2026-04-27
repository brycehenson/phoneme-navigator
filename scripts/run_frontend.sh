#!/usr/bin/env bash
set -euo pipefail

mkdir -p logs
LOG_FILE="${LOG_FILE:-logs/frontend.log}"

echo "[frontend] Logging to ${LOG_FILE}"

npm --prefix frontend run dev 2>&1 | tee -a "${LOG_FILE}"
