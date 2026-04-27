#!/usr/bin/env bash
set -euo pipefail

tail -n "${1:-80}" logs/backend.log logs/frontend.log
