# Changelog

All notable changes to this template are documented in this file.

## [Unreleased]

## [2026-02-24]

### Added
- Added [`src/phoneme_navigator/project_path.py`](src/phoneme_navigator/project_path.py) with `get_project_path()` based on the `WorkspaceFolder` environment variable.
  - Motivation: provide a single utility for repo-root discovery in scripts and runtime helpers.
- Added devcontainer mount for `${HOME}/.codex` in [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json).
  - Motivation: reuse local Codex settings inside containers without one-off reconfiguration.
- Added [`.devcontainer/install_uv.sh`](.devcontainer/install_uv.sh) and [`.devcontainer/chrome-kaleido`](.devcontainer/chrome-kaleido).
  - Motivation: make UV installation explicit and provide a deterministic browser wrapper for headless Plotly export.
- Added this `CHANGELOG.md`.
  - Motivation: keep template evolution auditable for downstream projects.

### Changed
- Switched devcontainer base image to `mcr.microsoft.com/devcontainers/base:debian` in [`.devcontainer/Dockerfile`](.devcontainer/Dockerfile).
  - Motivation: avoid hidden/preinstalled Python toolchain behavior from language-specific base images and keep environment composition explicit.
- Added explicit system tooling install in [`.devcontainer/Dockerfile`](.devcontainer/Dockerfile) (Python, base build dependencies, Chromium stack, and fonts) instead of inheriting pre-baked tooling from upstream images.
  - Motivation: ensure reproducible, inspectable build dependencies for notebook and plotting workflows.
- Switched template dependency workflow from Poetry metadata to PEP 621 + dependency groups in [`pyproject.toml`](pyproject.toml).
  - Motivation: align with UV-native workflows and make dependency semantics explicit via standard project metadata.
- Switched post-create install flow to UV sync in [`.devcontainer/post-create.sh`](.devcontainer/post-create.sh), with a fallback path when `uv.lock` is not present.
  - Motivation: enforce one deterministic dependency install path for dev containers.
- Updated devcontainer Python interpreter path to `/usr/bin/python3` and reduced editor extension set in [`.devcontainer/devcontainer.json`](.devcontainer/devcontainer.json).
  - Motivation: reduce coupling to editor-side formatter/linter extensions and rely on project-managed tooling.
- Removed `pyenv` bootstrap from [`.devcontainer/Dockerfile`](.devcontainer/Dockerfile).
  - Motivation: keep the template environment minimal and avoid unnecessary Python version-manager complexity.
- Added `pre-commit`, `nbstripout-fast`, and `nbdime` to the `dev` dependency group in [`pyproject.toml`](pyproject.toml).
  - Motivation: remove ad-hoc git/notebook tool installs from image build and pin them with the project toolchain.
- Updated README commands and customization guidance from Poetry to UV in [`README.md`](README.md).
  - Motivation: keep onboarding docs consistent with the actual build/runtime workflow.
- Updated local pre-commit hooks in [`.pre-commit-config.yaml`](.pre-commit-config.yaml) to run `nbstripout-fast` for notebooks and `black`/`isort` as system tools.
  - Motivation: standardize notebook-cleanup and formatting behavior through a single, project-managed hook set.

### Removed
- Removed both `CODEX_NOTES.md` and repo-level `AGENTS.md`.
  - Motivation: rely on global agent guidance and avoid repository-local policy duplication.
- Removed Poetry-specific repository artifacts (`poetry.lock`, `poetry.toml`, and devcontainer Poetry installer script).
  - Motivation: prevent mixed package-manager states and reduce maintenance overhead.
- Removed devcontainer dependency on custom Docker network args and in-container ad-hoc pipx git tool installs.
  - Motivation: improve portability across hosts and centralize tool versioning in project dependencies.
