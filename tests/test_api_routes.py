"""Tests for the FastAPI backend scaffold."""

from io import BytesIO
import wave

from fastapi.testclient import TestClient

from phoneme_navigator.api.dependencies import get_kokoro_client
from phoneme_navigator.api.app import app


class FakeKokoroClient:
    async def list_voices(self):
        return ["af_bella", "bm_lewis"]

    async def speak(self, phonemes, voice, speed):
        del phonemes, voice, speed
        sample_rate_hz = 16_000
        sample_count = sample_rate_hz * 2
        samples = bytearray()
        for index in range(sample_count):
            sample = int(10_000 * (index % 32) / 31)
            samples.extend(sample.to_bytes(2, byteorder="little", signed=True))

        buffer = BytesIO()
        with wave.open(buffer, "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(sample_rate_hz)
            wav_file.writeframes(bytes(samples))
        return buffer.getvalue()


def test_healthz_returns_runtime_configuration():
    client = TestClient(app)

    response = client.get("/healthz")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "kokoro_base_url" in payload


def test_navigation_rebuilds_tokens_for_existing_phoneme_string():
    client = TestClient(app)

    response = client.post("/api/navigation", json={"phonemes": "ˈrʌf"})

    assert response.status_code == 200
    payload = response.json()
    assert payload["phonemes"] == "ˈrʌf"
    assert payload["tokens"][0]["text"] == "ˈ"
    assert payload["tokens"][0]["token_kind"] == "stress"


def test_voices_lists_available_kokoro_voices():
    app.dependency_overrides[get_kokoro_client] = lambda: FakeKokoroClient()
    client = TestClient(app)

    try:
        response = client.get("/api/voices")
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    assert response.json() == {"voices": ["af_bella", "bm_lewis"]}


def test_spectrogram_returns_plotly_ready_arrays():
    app.dependency_overrides[get_kokoro_client] = lambda: FakeKokoroClient()
    client = TestClient(app)

    try:
        response = client.post(
            "/api/spectrogram",
            json={
                "phonemes": "ˈrʌf",
                "voice": "af_bella",
                "speed": 1.0,
                "window_ms": 20.0,
                "hop_ms": 5.0,
                "top_db": 70.0,
                "max_frequency_hz": 6_000.0,
                "smoothing": 0.5,
            },
        )
    finally:
        app.dependency_overrides.clear()

    assert response.status_code == 200
    payload = response.json()
    assert payload["sample_rate_hz"] == 16_000
    assert payload["window_ms"] == 20.0
    assert payload["hop_ms"] == 5.0
    assert payload["top_db"] == 70.0
    assert payload["max_frequency_hz"] == 6_000.0
    assert len(payload["times_s"]) > 0
    assert 1.0 < payload["times_s"][-1] < 1.5
    assert len(payload["frequencies_hz"]) > 0
    assert payload["frequencies_hz"][-1] <= 6_000.0
    assert len(payload["magnitudes_db"]) == len(payload["frequencies_hz"])
    assert len(payload["magnitudes_db"][0]) == len(payload["times_s"])
