"""Orchestration for text-to-phoneme conversion."""

from __future__ import annotations

from phoneme_navigator.clients.kokoro_client import KokoroClient
from phoneme_navigator.models.responses import PhonemizeResponse
from phoneme_navigator.services.navigation_service import NavigationService


class PhonemizeService:
    """Convert input text into phoneme navigation state."""

    def __init__(
        self, kokoro_client: KokoroClient, navigation_service: NavigationService
    ) -> None:
        self._kokoro_client = kokoro_client
        self._navigation_service = navigation_service

    async def phonemize(self, text: str, language: str) -> PhonemizeResponse:
        """Fetch phonemes from Kokoro and map them into UI state."""
        phonemes = await self._kokoro_client.phonemize(text=text, language=language)
        snapshot = self._navigation_service.build_snapshot(phonemes)
        return PhonemizeResponse(input_text=text, **snapshot.model_dump())

    def navigation_snapshot(self, phonemes: str):
        """Build navigation state from an already available phoneme string."""
        return self._navigation_service.build_snapshot(phonemes)
