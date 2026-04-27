"""Tests for backend logging configuration."""

from __future__ import annotations

import logging

from phoneme_navigator.core.config import LoggingConfig
from phoneme_navigator.core.logging import configure_logging, set_request_id


def test_configure_logging_writes_rotating_file_with_pretty_extra(tmp_path):
    """Configured logging should write extras into the target log file."""
    logger = configure_logging(
        LoggingConfig(
            log_dir_path=tmp_path,
            file_level="INFO",
            console_level="WARNING",
            max_file_bytes=1024,
            backup_file_count=2,
            enable_console=False,
        ),
        "backend.log",
    )

    set_request_id("test-request-id")
    logger.info("Structured message.", extra={"event": "unit_test", "count": 2})

    for handler in logging.getLogger().handlers:
        handler.flush()

    log_text = (tmp_path / "backend.log").read_text(encoding="utf-8")
    assert "Structured message." in log_text
    assert '"event": "unit_test"' in log_text
    assert '"count": 2' in log_text
    assert '"request_id": "test-request-id"' in log_text
