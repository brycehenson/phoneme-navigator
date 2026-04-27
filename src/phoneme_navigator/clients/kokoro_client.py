"""HTTP client for the Kokoro FastAPI service."""

from __future__ import annotations

from base64 import b64decode
import logging

import httpx

from phoneme_navigator.core.config import Settings


class KokoroClientError(RuntimeError):
    """Raised when the Kokoro service cannot fulfill a request."""


class KokoroClient:
    """Thin client for Kokoro phonemization and synthesis endpoints."""

    def __init__(self, settings: Settings) -> None:
        self._base_url = settings.kokoro_base_url.rstrip("/")
        self._timeout_s = settings.kokoro_timeout_s
        self._logger = logging.getLogger(__name__)

    async def phonemize(self, text: str, language: str) -> str:
        """Request a phoneme string from Kokoro."""
        payload = {"text": text, "language": language}
        data = await self._post_json("/dev/phonemize", payload)

        for key in ("phonemes", "phoneme_string", "result", "output"):
            value = data.get(key)
            if isinstance(value, str) and value.strip():
                return value

        raise KokoroClientError(
            "Kokoro phonemize response did not include a phoneme string"
        )

    async def speak(self, phonemes: str, voice: str, speed: float) -> bytes:
        """Request synthesized audio from Kokoro."""
        payload = {"phonemes": phonemes, "voice": voice, "speed": speed}
        endpoint = "/dev/generate_from_phonemes"
        self._logger.info(
            "Calling Kokoro synthesis endpoint.",
            extra={
                "voice": voice,
                "phoneme_chars": len(phonemes),
                "endpoint": endpoint,
            },
        )

        try:
            async with httpx.AsyncClient(
                base_url=self._base_url, timeout=self._timeout_s
            ) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise KokoroClientError(
                f"Kokoro synthesis request failed for {endpoint}: {exc}"
            ) from exc

        content_type = response.headers.get("content-type", "")
        if content_type.startswith("audio/"):
            return response.content

        data = response.json()
        if isinstance(data.get("audio_bytes"), str):
            return b64decode(data["audio_bytes"])

        raise KokoroClientError(
            "Kokoro synthesis response did not contain audio bytes"
        )

    async def list_voices(self) -> list[str]:
        """Return the available Kokoro voice IDs."""
        data = await self._get_json("/v1/audio/voices")
        voices = data.get("voices")
        if (
            isinstance(voices, list)
            and all(isinstance(voice, str) for voice in voices)
        ):
            return voices

        raise KokoroClientError("Kokoro voices response did not include voices")

    async def _get_json(self, endpoint: str) -> dict[str, object]:
        """Get JSON from Kokoro and return the decoded response body."""
        self._logger.info("Calling Kokoro endpoint.", extra={"endpoint": endpoint})

        try:
            async with httpx.AsyncClient(
                base_url=self._base_url, timeout=self._timeout_s
            ) as client:
                response = await client.get(endpoint)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise KokoroClientError(
                f"Kokoro request failed for {endpoint}: {exc}"
            ) from exc

        data = response.json()
        if not isinstance(data, dict):
            raise KokoroClientError(
                f"Kokoro response for {endpoint} was not a JSON object"
            )
        return data

    async def _post_json(self, endpoint: str, payload: dict[str, object]) -> dict[str, object]:
        """Post JSON to Kokoro and return the decoded response body."""
        self._logger.info(
            "Calling Kokoro endpoint.",
            extra={
                "endpoint": endpoint,
                "payload_keys": sorted(payload.keys()),
            },
        )

        try:
            async with httpx.AsyncClient(
                base_url=self._base_url, timeout=self._timeout_s
            ) as client:
                response = await client.post(endpoint, json=payload)
                response.raise_for_status()
        except httpx.HTTPError as exc:
            raise KokoroClientError(
                f"Kokoro request failed for {endpoint}: {exc}"
            ) from exc

        data = response.json()
        if not isinstance(data, dict):
            raise KokoroClientError(
                f"Kokoro response for {endpoint} was not a JSON object"
            )
        return data
