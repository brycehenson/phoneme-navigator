"""Tests for the FastAPI backend scaffold."""

from fastapi.testclient import TestClient

from phoneme_navigator.api.dependencies import get_kokoro_client
from phoneme_navigator.api.app import app


class FakeKokoroClient:
    async def list_voices(self):
        return ["af_bella", "bm_lewis"]


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
