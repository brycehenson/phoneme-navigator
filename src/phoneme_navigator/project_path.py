"""Helpers for locating the project root inside the devcontainer."""

from __future__ import annotations

import logging
import os
from pathlib import Path


def get_project_path() -> Path:
    """Return the project root from the devcontainer environment.

    Falls back to the current working directory when `WorkspaceFolder` is not
    defined, which keeps local CLI usage functional outside the container.
    """
    logger = logging.getLogger(__name__)
    workspace_folder = os.environ.get("WorkspaceFolder")
    if workspace_folder:
        return Path(workspace_folder)

    logger.warning("WorkspaceFolder not set; falling back to current directory")
    return Path.cwd()
