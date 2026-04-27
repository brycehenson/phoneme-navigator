"""Logging setup helpers for phoneme_navigator processes."""

from __future__ import annotations

from contextvars import ContextVar
import json
import logging
from logging.handlers import RotatingFileHandler
import uuid

from phoneme_navigator.core.config import LoggingConfig

_REQUEST_ID: ContextVar[str] = ContextVar("request_id", default="-")
_RESERVED_LOG_RECORD_FIELDS = frozenset(logging.makeLogRecord({}).__dict__) | {
    "asctime",
    "message",
}


class RequestIdFilter(logging.Filter):
    """Attach the active request id to every log record."""

    def filter(self, record: logging.LogRecord) -> bool:
        record.request_id = _REQUEST_ID.get()
        return True


def set_request_id(request_id: str | None = None) -> str:
    """Store and return the request id for the current context."""
    active_request_id = request_id or str(uuid.uuid4())
    _REQUEST_ID.set(active_request_id)
    return active_request_id


def clear_request_id() -> None:
    """Reset the request id for the current context."""
    _REQUEST_ID.set("-")


class ExtraPrettyFormatter(logging.Formatter):
    """Formatter that appends structured ``extra`` fields as pretty JSON."""

    def format(self, record: logging.LogRecord) -> str:
        """Format one log record, appending non-standard fields when present."""
        formatted = super().format(record)
        extra_payload = {
            key: value
            for key, value in record.__dict__.items()
            if key not in _RESERVED_LOG_RECORD_FIELDS
        }
        if not extra_payload:
            return formatted

        return (
            f"{formatted}\n"
            f"extra={json.dumps(extra_payload, indent=2, sort_keys=True, default=str)}"
        )


def configure_logging(
    logging_config: LoggingConfig, log_file_name: str
) -> logging.Logger:
    """Configure a process logger.

    Args:
        logging_config: Logging configuration.
        log_file_name: File name for the active process log.

    Returns:
        Configured logger instance.
    """
    file_level = getattr(logging, logging_config.file_level.upper(), logging.DEBUG)
    process_logger = logging.getLogger(log_file_name)
    process_logger.setLevel(file_level)
    process_logger.handlers.clear()
    process_logger.propagate = True

    logging_config.log_dir_path.mkdir(parents=True, exist_ok=True)
    file_handler = RotatingFileHandler(
        logging_config.log_dir_path / log_file_name,
        maxBytes=logging_config.max_file_bytes,
        backupCount=logging_config.backup_file_count,
        encoding="utf-8",
    )
    file_handler.setLevel(file_level)
    file_handler.addFilter(RequestIdFilter())
    file_handler.setFormatter(
        ExtraPrettyFormatter(
            "%(asctime)s %(levelname)s %(name)s %(message)s | %(filename)s:%(lineno)d"
        )
    )

    root_logger = logging.getLogger()
    root_logger.setLevel(file_level)
    root_logger.handlers.clear()
    root_logger.addHandler(file_handler)

    if logging_config.enable_console:
        console_handler = logging.StreamHandler()
        console_handler.setLevel(
            getattr(logging, logging_config.console_level.upper(), logging.WARNING)
        )
        console_handler.addFilter(RequestIdFilter())
        console_handler.setFormatter(ExtraPrettyFormatter("%(levelname)s %(message)s"))
        root_logger.addHandler(console_handler)

    process_logger.info(
        "Configured process logging.",
        extra={
            "log_file_name": log_file_name,
            "log_dir_path": str(logging_config.log_dir_path),
            "file_level": logging_config.file_level,
            "max_file_bytes": logging_config.max_file_bytes,
            "backup_file_count": logging_config.backup_file_count,
            "console_level": logging_config.console_level,
            "enable_console": logging_config.enable_console,
        },
    )
    return process_logger
