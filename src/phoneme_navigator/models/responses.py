"""Response models for the backend API."""

from __future__ import annotations

from pydantic import BaseModel

from phoneme_navigator.models.phonemes import NavigationSnapshot


class HealthResponse(BaseModel):
    """Liveness summary for local development."""

    status: str
    app_env: str
    kokoro_base_url: str


class PhonemizeResponse(NavigationSnapshot):
    """API response for `/api/phonemize`."""

    input_text: str


class NavigationResponse(NavigationSnapshot):
    """API response for rebuilding token navigation state."""


class VoicesResponse(BaseModel):
    """API response for available speech synthesis voices."""

    voices: list[str]
