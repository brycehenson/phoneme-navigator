"""Tests for runtime configuration loading."""

from phoneme_navigator.core.config import get_settings


def test_settings_loads_kokoro_base_url_from_env_file(tmp_path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("PHONEME_NAV_KOKORO_BASE_URL", raising=False)
    (tmp_path / ".env").write_text(
        "PHONEME_NAV_KOKORO_BASE_URL=http://example.test:8880/\n",
        encoding="utf-8",
    )
    get_settings.cache_clear()

    try:
        settings = get_settings()
    finally:
        get_settings.cache_clear()

    assert settings.kokoro_base_url == "http://example.test:8880"
