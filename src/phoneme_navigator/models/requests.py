"""Request models for the backend API."""

from __future__ import annotations

from pydantic import BaseModel, Field


class PhonemizeRequest(BaseModel):
    """Input payload for phonemization."""

    text: str = Field(min_length=1)
    language: str = Field(default="a", min_length=1)


class SpeakRequest(BaseModel):
    """Input payload for speech synthesis from phonemes."""

    phonemes: str = Field(min_length=1)
    voice: str = Field(default="af_bella", min_length=1)
    speed: float = Field(default=1.0, gt=0.0, le=3.0)


class NavigationRequest(BaseModel):
    """Input payload for rebuilding token navigation state."""

    phonemes: str = Field(min_length=1)
