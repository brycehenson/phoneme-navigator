#!/usr/bin/env bash
set -euo pipefail

echo "[post-create] Verifying internet connectivity (ping google.com)"
if ! ping -c 1 -W 2 google.com >/dev/null 2>&1; then
  echo "[post-create] Unable to reach google.com; aborting." >&2
  exit 1
fi


echo "[post-create] Installing project dependencies with uv into system Python as root"
sudo env \
  HOME=/root \
  UV_CACHE_DIR=/home/vscode/.cache/uv \
  UV_PROJECT_ENVIRONMENT="$(python3 -c "import sysconfig; print(sysconfig.get_config_var('prefix'))")" \
  UV_LINK_MODE=copy \
  uv sync --frozen --extra dev

if [ -f frontend/package.json ]; then
  echo "[post-create] Installing frontend dependencies"
  npm --prefix frontend install
fi

# Setup some git settings to make it work out of the box
git config --global --add safe.directory ${WorkspaceFolder}
git config --global push.autoSetupRemote true

# Merge by default
git config pull.rebase false
# Install stripping of outputs for ipynb
git config --local include.path "../.devcontainer/clear_ipynb_output.gitconfig" || true


mkdir -p /home/vscode/.cache/pre-commit
sudo chown -R vscode:vscode /home/vscode/.cache/pre-commit

# setup the git pre-commit hooks
pre-commit install


# Make sure everything is owned by us (we used to use the root user in the container)
sudo chown -R vscode:vscode $WorkspaceFolder


# Configure git user from host environment variables if provided
if [ -n "${HOST_GIT_NAME:-}" ]; then
  git config --global user.name "$HOST_GIT_NAME"
fi
if [ -n "${HOST_GIT_EMAIL:-}" ]; then
  git config --global user.email "$HOST_GIT_EMAIL"
fi
