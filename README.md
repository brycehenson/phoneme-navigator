# Phoneme Navigator

Phoneme Navigator is a pronunciation-editing prototype built around Kokoro-FastAPI.
Instead of treating a phoneme string as raw text, it treats pronunciation repair as a local navigation problem: phonemes are tokenised into sensible editable units, a token is selected, and the user explores nearby phonetic moves such as "weaker", "more open", "rounder", or "backer".

The project started as the notebook prototype in [kokoro_phoneme_navigator_demo.ipynb](/workspaces/phoneme_navigator/kokoro_phoneme_navigator_demo.ipynb) and is being translated into a React web app with a Python backend.

## What It Does

The intended workflow is:

1. Enter a word or short phrase.
2. Press `Phonemize`.
3. Call Kokoro-FastAPI `/dev/phonemize`.
4. Tokenise the returned phoneme string into editable units.
5. Show the phoneme string as selectable tokens.
6. Select a token by mouse or keyboard.
7. Show local candidate moves around the selected token.
8. Apply a move to change the phoneme string.
9. Call Kokoro-FastAPI `/dev/generate_from_phonemes` to hear the updated result.

The central design assumption from the notebook is:

- users often know the direction of the pronunciation error better than the exact IPA symbol they want
- candidate edits should therefore carry both an IPA replacement and a perceptual label
- the candidate graph is intentionally task-specific rather than a full IPA chart

## Current State

This repository now contains three related surfaces:

- The original notebook prototype: [kokoro_phoneme_navigator_demo.ipynb](/workspaces/phoneme_navigator/kokoro_phoneme_navigator_demo.ipynb)
- A Python backend under [src/phoneme_navigator](/workspaces/phoneme_navigator/src/phoneme_navigator)
- A React/Vite frontend under [frontend](/workspaces/phoneme_navigator/frontend)

The web app already supports the core loop:

- phonemize text through Kokoro
- tokenise the phoneme string into editable units
- select phoneme tokens
- view local candidate edits
- apply edits and rebuild navigation state
- undo the last edit
- replay the current phoneme string through Kokoro

The richer notebook behaviour is still being ported. In particular, the full candidate table and the more advanced lattice-style neighbourhood UI are only partially translated so far.

## Kokoro Dependency

There is no mock mode in the original notebook design, and the same assumption currently holds for the web app. You need a running Kokoro-FastAPI server.

Relevant upstream endpoints:

```text
POST /dev/phonemize
POST /dev/generate_from_phonemes
```

Current project defaults:

```text
Kokoro URL: http://localhost:8880/
Language:   a
Voice:      af_bella
```

The backend default is configured in [src/phoneme_navigator/core/config.py](/workspaces/phoneme_navigator/src/phoneme_navigator/core/config.py:1). You can override it with a local `.env` file:

```bash
PHONEME_NAV_KOKORO_BASE_URL=http://your-host:8880/
```

## Architecture

The current split is:

- `frontend/`
  React UI for text entry, token selection, candidate application, undo, and audio replay
- `src/phoneme_navigator/api/`
  FastAPI routes for health, phonemization, navigation rebuild, and speech synthesis
- `src/phoneme_navigator/domain/`
  Pure tokenization and candidate-move logic translated from the notebook
- `src/phoneme_navigator/clients/`
  Kokoro-FastAPI HTTP client
- `src/phoneme_navigator/services/`
  Orchestration that converts Kokoro responses into frontend navigation state

The browser talks to the Python backend, and the backend talks to Kokoro. This keeps Kokoro-specific request shapes, error handling, and future phonological logic out of the browser.

## Token and Edit Model

The notebook spec drives the current backend model:

- common diphthongs and affricates should stay grouped as single editable units
- stress markers should stay distinct
- diacritics such as `ː` should stay attached to the preceding phoneme
- candidate edits are directional and labeled

Examples of supported token kinds:

- `vowel`
- `consonant`
- `stress`
- `diacritic`
- `separator`

Examples of supported edit actions:

- `replace`
- `delete`
- `insert_stress_before`
- `insert_copy_before`

## Keyboard Model

The notebook prototype used a keyboard-first interaction model. The current web app already carries part of that over:

- `Left` and `Right` move between editable tokens
- `Up` and `Down` apply matching vertical candidate moves when present
- `Space` replays the current phoneme string
- `z` undoes the last edit

The notebook also defined additional directional shortcuts and edit commands, and those can be added as the lattice UI is ported over.

## Development

Install Python dependencies:

```bash
uv sync --extra dev
```

Install frontend dependencies:

```bash
npm --prefix frontend install
```

Start the backend:

```bash
./scripts/run_backend.sh
```

Start the frontend:

```bash
./scripts/run_frontend.sh
```

Check Kokoro reachability:

```bash
./scripts/check_kokoro.sh
```

The devcontainer forwards these ports:

- `5173` for the Vite frontend
- `8000` for the FastAPI backend
- `8880` for Kokoro-FastAPI

## API Surface

Current backend routes:

- `GET /healthz`
- `POST /api/phonemize`
- `POST /api/navigation`
- `POST /api/speak`

The two routes that define the main editing loop are:

- `/api/phonemize`
  text to phoneme string plus token navigation state
- `/api/navigation`
  phoneme string to refreshed token navigation state after an edit

## Logging and Debugging

Backend logs are written to `./logs/backend.log` with rotating file handling and structured `extra` payloads.

Useful scripts:

- [scripts/run_backend.sh](/workspaces/phoneme_navigator/scripts/run_backend.sh:1)
- [scripts/run_frontend.sh](/workspaces/phoneme_navigator/scripts/run_frontend.sh:1)
- [scripts/check_kokoro.sh](/workspaces/phoneme_navigator/scripts/check_kokoro.sh:1)
- [scripts/tail_logs.sh](/workspaces/phoneme_navigator/scripts/tail_logs.sh:1)

Run tests with:

```bash
uv run pytest
```

Build the frontend with:

```bash
npm --prefix frontend run build
```

## Repository Layout

```text
phoneme_navigator/
├── frontend/
├── scripts/
├── src/
│   ├── phoneme_navigator/
│   └── python_template/
├── tests/
└── kokoro_phoneme_navigator_demo.ipynb
```

`src/python_template/` still exists as leftover template material, but the project-specific code now lives under `src/phoneme_navigator/`.
