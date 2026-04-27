"""Dependency injection helpers for the FastAPI app."""

from __future__ import annotations

from fastapi import Depends

from phoneme_navigator.clients.kokoro_client import KokoroClient
from phoneme_navigator.core.config import Settings, get_settings
from phoneme_navigator.services.navigation_service import NavigationService
from phoneme_navigator.services.phonemize_service import PhonemizeService
from phoneme_navigator.services.spectrogram_service import SpectrogramService
from phoneme_navigator.services.synthesis_service import SynthesisService


def get_app_settings() -> Settings:
    """Return cached runtime settings."""
    return get_settings()


def get_kokoro_client(settings: Settings = Depends(get_app_settings)) -> KokoroClient:
    """Create the Kokoro HTTP client."""
    return KokoroClient(settings)


def get_navigation_service() -> NavigationService:
    """Create the navigation service."""
    return NavigationService()


def get_phonemize_service(
    kokoro_client: KokoroClient = Depends(get_kokoro_client),
) -> PhonemizeService:
    """Create the phonemize orchestration service."""
    return PhonemizeService(
        kokoro_client=kokoro_client,
        navigation_service=get_navigation_service(),
    )


def get_synthesis_service(
    kokoro_client: KokoroClient = Depends(get_kokoro_client),
) -> SynthesisService:
    """Create the speech synthesis service."""
    return SynthesisService(kokoro_client=kokoro_client)


def get_spectrogram_service(
    kokoro_client: KokoroClient = Depends(get_kokoro_client),
) -> SpectrogramService:
    """Create the spectrogram service."""
    return SpectrogramService(kokoro_client=kokoro_client)
