"""Orchestration for phoneme-to-audio synthesis."""

from __future__ import annotations

from phoneme_navigator.clients.kokoro_client import KokoroClient


class SynthesisService:
    """Convert phoneme strings into playable audio."""

    def __init__(self, kokoro_client: KokoroClient) -> None:
        self._kokoro_client = kokoro_client

    async def speak(self, phonemes: str, voice: str, speed: float) -> bytes:
        """Delegate synthesis to Kokoro."""
        return await self._kokoro_client.speak(
            phonemes=phonemes, voice=voice, speed=speed
        )
