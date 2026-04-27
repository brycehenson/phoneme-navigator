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


class SpectrogramRequest(SpeakRequest):
    """Input payload for speech spectrogram generation."""

    window_ms: float = Field(default=25.0, ge=10.0, le=80.0)
    hop_ms: float = Field(default=5.0, ge=1.0, le=40.0)
    top_db: float = Field(default=80.0, ge=40.0, le=120.0)
    max_frequency_hz: float = Field(default=8_000.0, ge=1_000.0, le=12_000.0)
    smoothing: float = Field(default=0.75, ge=0.0, le=2.5)
    trim_seconds: float = Field(default=0.3, ge=0.0, le=1.0)


class NavigationRequest(BaseModel):
    """Input payload for rebuilding token navigation state."""

    phonemes: str = Field(min_length=1)
