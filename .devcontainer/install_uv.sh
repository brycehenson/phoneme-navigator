#!/usr/bin/env bash
set -euo pipefail

echo "[install-uv] Installing uv into system Python"
python3 -m pip install --no-cache-dir --break-system-packages "uv>=0.8,<0.9"

echo "[install-uv] uv version:"
uv --version
