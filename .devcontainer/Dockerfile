# syntax=docker/dockerfile:1.5
# Use the minimal base image instead of devcontainers/python so we control
# exactly which Python/tools are installed and avoid preinstalled pipx tools
# under /usr/local/py-utils shadowing project-pinned versions (e.g., black).
FROM mcr.microsoft.com/devcontainers/base:debian

ARG DEBIAN_FRONTEND=noninteractive

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt/lists,sharing=locked \
    echo "Checking internet ..." && \
    timeout 3 getent hosts archive.ubuntu.com >/dev/null && \
    timeout 3 bash -c 'exec 3<>/dev/tcp/1.1.1.1/443' && \
    echo "Internet OK" && \
    apt-get update && \
    # System Python and headers for project environments and native wheels.
    apt-get install -y --no-install-recommends \
      python3 python3-pip python3-venv python3-dev && \
    # Common CLI tools used during development and interactive debugging.
    apt-get install -y --no-install-recommends \
      iputils-ping curl lnav bc bash-completion && \
    # Build and crypto libraries required by common Python packages.
    apt-get install -y --no-install-recommends \
      build-essential git ca-certificates gnupg bubblewrap \
      zlib1g-dev libssl-dev libbz2-dev libreadline-dev libsqlite3-dev \
      libffi-dev liblzma-dev tk-dev xz-utils && \
    # Codex currently needs a newer Node runtime than the base distro package
    # typically guarantees, so install Node 20 from NodeSource explicitly.
    mkdir -p /etc/apt/keyrings && \
    curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | \
      gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
    echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
      > /etc/apt/sources.list.d/nodesource.list && \
    apt-get update && \
    apt-get install -y --no-install-recommends nodejs && \
    npm install -g @openai/codex && \
    node --version && \
    npm --version && \
    codex --version && \
    # VS Code mounts the workspace from the host, so mark it safe for git.
    git config --system --add safe.directory '*' && \
    mkdir -p /root/setup_scripts && \
    apt-get autoremove -y 

# The sandboxing that codex relies on does not work in the container. So we rely on the container for isolation
ENV CODEX_HOME=/home/vscode/.codex
RUN install -d -m 700 "$CODEX_HOME" \
 && cat > "$CODEX_HOME/config.toml" <<'EOF'
sandbox_mode = "danger-full-access"
approval_policy = "on-request"
EOF
RUN chown -R vscode:vscode "$CODEX_HOME"


# Copy setup scripts
COPY .devcontainer/*.sh /setup_scripts/

RUN echo "Run setup setup_scripts" && \
    mkdir -p /home/vscode/.cache/uv && \
    chown -R vscode:vscode /home/vscode/.cache && \
    bash /setup_scripts/install_uv.sh && \
    echo "Fixing permissions" && \
    usermod -aG dialout vscode && \
    /setup_scripts/fix_permissions.sh && \
    chmod -R 755 /setup_scripts && \
    echo "Configuring shell init for vscode" && \
    echo "if [ -f /etc/bash_completion ]; then . /etc/bash_completion; fi" >> /home/vscode/.bashrc && \
    echo "source /usr/share/bash-completion/completions/git" >> /home/vscode/.bashrc && \
    echo "Done"


WORKDIR /workspaces

USER vscode
