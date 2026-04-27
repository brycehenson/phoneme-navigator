"""Spectrogram generation for synthesized phoneme audio."""

from __future__ import annotations

from io import BytesIO

import numpy as np
import numpy.typing as npt
from scipy import signal
from scipy.ndimage import gaussian_filter
from scipy.io import wavfile

from phoneme_navigator.clients.kokoro_client import KokoroClient
from phoneme_navigator.models.responses import SpectrogramResponse

DEFAULT_SPECTROGRAM_TRIM_SECONDS = 0.3


class SpectrogramService:
    """Convert synthesized phoneme audio into Plotly-ready spectrogram data."""

    def __init__(self, kokoro_client: KokoroClient) -> None:
        self._kokoro_client = kokoro_client

    async def spectrogram(
        self,
        phonemes: str,
        voice: str,
        speed: float,
        window_ms: float,
        hop_ms: float,
        top_db: float,
        max_frequency_hz: float,
        smoothing: float,
        trim_seconds: float = DEFAULT_SPECTROGRAM_TRIM_SECONDS,
    ) -> SpectrogramResponse:
        """Synthesize phonemes and compute a decibel spectrogram."""
        audio_bytes = await self._kokoro_client.speak(
            phonemes=phonemes, voice=voice, speed=speed
        )
        return compute_spectrogram(
            audio_bytes,
            window_ms=window_ms,
            hop_ms=hop_ms,
            top_db=top_db,
            max_frequency_hz=max_frequency_hz,
            smoothing=smoothing,
            trim_seconds=trim_seconds,
        )


def compute_spectrogram(
    audio_bytes: bytes,
    *,
    window_ms: float = 25.0,
    hop_ms: float = 5.0,
    top_db: float = 80.0,
    max_frequency_hz: float = 8_000.0,
    smoothing: float = 0.75,
    trim_seconds: float = DEFAULT_SPECTROGRAM_TRIM_SECONDS,
) -> SpectrogramResponse:
    """Compute a compact spectrogram from WAV audio bytes."""
    sample_rate_hz, samples = wavfile.read(BytesIO(audio_bytes))
    mono_samples = _mono_float_samples(samples)
    if mono_samples.size < 2:
        raise ValueError("Audio must contain at least two samples")

    mono_samples = _trim_silence_padding(
        mono_samples, sample_rate_hz=sample_rate_hz, trim_seconds=trim_seconds
    )
    window_length = min(
        max(2, int(round(window_ms * 1.0e-3 * sample_rate_hz))),
        mono_samples.size,
    )
    hop_length = max(1, int(round(hop_ms * 1.0e-3 * sample_rate_hz)))
    hop_length = min(hop_length, max(1, window_length - 1))
    n_fft = _next_power_of_two(window_length)
    frequencies_hz, times_s, stft = signal.stft(
        mono_samples,
        fs=float(sample_rate_hz),
        window="hann",
        nperseg=window_length,
        noverlap=window_length - hop_length,
        nfft=n_fft,
        boundary="zeros",
        padded=True,
    )
    magnitudes = np.abs(stft)
    reference = max(float(np.max(magnitudes)), 1.0e-10)
    magnitudes_db = 20.0 * np.log10(np.maximum(magnitudes, 1.0e-10) / reference)
    if smoothing > 0.0:
        magnitudes_db = gaussian_filter(magnitudes_db, sigma=(smoothing, smoothing))
    magnitudes_db = np.clip(magnitudes_db, -top_db, 0.0)
    frequency_mask = frequencies_hz <= max_frequency_hz

    return SpectrogramResponse(
        sample_rate_hz=int(sample_rate_hz),
        window_ms=window_ms,
        hop_ms=hop_ms,
        top_db=top_db,
        max_frequency_hz=max_frequency_hz,
        times_s=times_s.astype(float).tolist(),
        frequencies_hz=frequencies_hz[frequency_mask].astype(float).tolist(),
        magnitudes_db=magnitudes_db[frequency_mask].astype(float).tolist(),
    )


def _mono_float_samples(samples: npt.NDArray[np.generic]) -> npt.NDArray[np.float64]:
    """Return mono float samples in roughly -1.0 to 1.0 amplitude."""
    sample_array = np.asarray(samples)
    if sample_array.ndim == 2:
        sample_array = sample_array.mean(axis=1)
    if np.issubdtype(sample_array.dtype, np.integer):
        dtype_info = np.iinfo(sample_array.dtype)
        scale = float(max(abs(dtype_info.min), dtype_info.max))
        return sample_array.astype(np.float64) / scale
    return sample_array.astype(np.float64, copy=False)


def _trim_silence_padding(
    samples: npt.NDArray[np.float64], *, sample_rate_hz: int, trim_seconds: float
) -> npt.NDArray[np.float64]:
    """Trim fixed leading and trailing padding when enough audio remains."""
    trim_samples = int(round(sample_rate_hz * trim_seconds))
    if trim_samples <= 0 or samples.size <= (trim_samples * 2) + 2:
        return samples
    return samples[trim_samples:-trim_samples]


def _next_power_of_two(value: int) -> int:
    """Return the smallest power of two greater than or equal to value."""
    return 1 << max(0, value - 1).bit_length()
