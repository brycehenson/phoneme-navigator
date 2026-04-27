"""Runtime configuration for the phoneme navigator backend."""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
import os
from pathlib import Path


def _load_env_file(env_file_path: Path = Path(".env")) -> None:
    """Load simple KEY=VALUE pairs from an env file without overriding exports."""
    if not env_file_path.exists():
        return

    for raw_line in env_file_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", maxsplit=1)
        key = key.strip()
        value = value.strip().strip("\"'")
        if key:
            os.environ.setdefault(key, value)


@dataclass(frozen=True, kw_only=True)
class LoggingConfig:
    """Configuration for backend log file handling."""

    log_dir_path: Path = Path("logs")
    file_level: str = "INFO"
    console_level: str = "WARNING"
    max_file_bytes: int = 1_048_576
    backup_file_count: int = 5
    enable_console: bool = True


@dataclass(frozen=True, kw_only=True)
class Settings:
    """Configuration derived from environment variables."""

    app_name: str = "phoneme-navigator"
    app_env: str = "development"
    log_level: str = "INFO"
    logging_config: LoggingConfig = LoggingConfig()
    backend_host: str = "0.0.0.0"
    backend_port: int = 8000
    frontend_origin: str = "http://localhost:5173"
    kokoro_base_url: str = "http://localhost:8880/"
    kokoro_timeout_s: float = 20.0
    default_language: str = "a"
    default_voice: str = "af_bella"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Build and cache backend settings from the environment."""
    _load_env_file()
    log_level = os.environ.get("PHONEME_NAV_LOG_LEVEL", "INFO").upper()
    return Settings(
        app_env=os.environ.get("PHONEME_NAV_APP_ENV", "development"),
        log_level=log_level,
        logging_config=LoggingConfig(
            log_dir_path=Path(
                os.environ.get("PHONEME_NAV_LOG_DIR", "logs")
            ),
            file_level=log_level,
            console_level=os.environ.get(
                "PHONEME_NAV_CONSOLE_LOG_LEVEL", "WARNING"
            ).upper(),
            max_file_bytes=int(
                os.environ.get("PHONEME_NAV_MAX_LOG_FILE_BYTES", "1048576")
            ),
            backup_file_count=int(
                os.environ.get("PHONEME_NAV_LOG_BACKUP_FILE_COUNT", "5")
            ),
            enable_console=os.environ.get(
                "PHONEME_NAV_ENABLE_CONSOLE_LOGGING", "true"
            ).lower()
            in {"1", "true", "yes", "on"},
        ),
        backend_host=os.environ.get("PHONEME_NAV_BACKEND_HOST", "0.0.0.0"),
        backend_port=int(os.environ.get("PHONEME_NAV_BACKEND_PORT", "8000")),
        frontend_origin=os.environ.get(
            "PHONEME_NAV_FRONTEND_ORIGIN", "http://localhost:5173"
        ),
        kokoro_base_url=os.environ.get(
            "PHONEME_NAV_KOKORO_BASE_URL", "http://localhost:8880/"
        ).rstrip("/"),
        kokoro_timeout_s=float(
            os.environ.get("PHONEME_NAV_KOKORO_TIMEOUT_S", "20.0")
        ),
        default_language=os.environ.get("PHONEME_NAV_DEFAULT_LANGUAGE", "a"),
        default_voice=os.environ.get("PHONEME_NAV_DEFAULT_VOICE", "af_bella"),
    )
