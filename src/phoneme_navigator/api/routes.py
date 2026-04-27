"""HTTP routes for the phoneme navigator backend."""

from __future__ import annotations

import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response

from phoneme_navigator.api.dependencies import (
    get_app_settings,
    get_kokoro_client,
    get_phonemize_service,
    get_synthesis_service,
)
from phoneme_navigator.clients.kokoro_client import KokoroClient, KokoroClientError
from phoneme_navigator.core.config import Settings
from phoneme_navigator.models.requests import (
    NavigationRequest,
    PhonemizeRequest,
    SpeakRequest,
)
from phoneme_navigator.models.responses import (
    HealthResponse,
    NavigationResponse,
    PhonemizeResponse,
    VoicesResponse,
)
from phoneme_navigator.services.phonemize_service import PhonemizeService
from phoneme_navigator.services.synthesis_service import SynthesisService

router = APIRouter()
logger = logging.getLogger(__name__)


@router.get("/healthz", response_model=HealthResponse)
async def healthz(settings: Settings = Depends(get_app_settings)) -> HealthResponse:
    """Report backend liveness and configured upstream target."""
    return HealthResponse(
        status="ok",
        app_env=settings.app_env,
        kokoro_base_url=settings.kokoro_base_url,
    )


@router.post("/api/phonemize", response_model=PhonemizeResponse)
async def phonemize(
    request: PhonemizeRequest,
    service: PhonemizeService = Depends(get_phonemize_service),
) -> PhonemizeResponse:
    """Phonemize free text and prepare editable navigation state."""
    try:
        return await service.phonemize(text=request.text, language=request.language)
    except KokoroClientError as exc:
        logger.exception("Phonemize request failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/api/voices", response_model=VoicesResponse)
async def voices(
    kokoro_client: KokoroClient = Depends(get_kokoro_client),
) -> VoicesResponse:
    """List available Kokoro synthesis voices."""
    try:
        return VoicesResponse(voices=await kokoro_client.list_voices())
    except KokoroClientError as exc:
        logger.exception("Voice list request failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/api/navigation", response_model=NavigationResponse)
async def navigation(
    request: NavigationRequest,
    service: PhonemizeService = Depends(get_phonemize_service),
) -> NavigationResponse:
    """Rebuild editable navigation state from an existing phoneme string."""
    snapshot = service.navigation_snapshot(request.phonemes)
    return NavigationResponse(**snapshot.model_dump())


@router.post("/api/speak")
async def speak(
    request: SpeakRequest,
    service: SynthesisService = Depends(get_synthesis_service),
) -> Response:
    """Synthesize audio directly from a phoneme string."""
    try:
        audio_bytes = await service.speak(
            phonemes=request.phonemes, voice=request.voice, speed=request.speed
        )
    except KokoroClientError as exc:
        logger.exception("Speak request failed")
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return Response(content=audio_bytes, media_type="audio/wav")
