"""Transform phoneme strings into UI-facing navigation state."""

from __future__ import annotations

from phoneme_navigator.domain.neighbourhoods import candidate_moves
from phoneme_navigator.domain.tokenization import (
    normalize_phoneme_string,
    split_phoneme_tokens,
)
from phoneme_navigator.models.phonemes import NavigationSnapshot, PhonemeToken


class NavigationService:
    """Build token-level navigation state for the frontend."""

    def build_snapshot(self, phonemes: str) -> NavigationSnapshot:
        """Create a frontend-friendly token view."""
        normalized_phonemes = normalize_phoneme_string(phonemes)
        raw_tokens = split_phoneme_tokens(normalized_phonemes)
        tokens: list[PhonemeToken] = [
            PhonemeToken(
                index=index,
                text=token.text,
                token_type=token.token_type,  # type: ignore[arg-type]
                token_kind=token.token_kind,
                is_editable=token.is_editable,
                candidates=candidate_moves(token),
            )
            for index, token in enumerate(raw_tokens)
        ]

        selected_index = next(
            (token.index for token in tokens if token.is_editable), None
        )
        return NavigationSnapshot(
            phonemes=normalized_phonemes, tokens=tokens, selected_index=selected_index
        )
