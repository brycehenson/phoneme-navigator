"""Pure helpers for mutating token sequences."""

from __future__ import annotations

from phoneme_navigator.models.phonemes import CandidateMove, PhonemeToken


def replace_token(
    tokens: list[PhonemeToken], token_index: int, replacement: str
) -> str:
    """Return a phoneme string with one token replaced."""
    rendered_parts: list[str] = []
    for token in tokens:
        rendered_parts.append(replacement if token.index == token_index else token.text)

    return "".join(rendered_parts)


def apply_move(tokens: list[PhonemeToken], token_index: int, move: CandidateMove) -> str:
    """Return a phoneme string with one move applied."""
    if move.action == "replace":
        return replace_token(tokens, token_index, move.replacement)

    if move.action == "delete":
        rendered_parts = [
            token.text for token in tokens if token.index != token_index
        ]
        return "".join(rendered_parts)

    if move.action == "insert_stress_before":
        rendered_parts: list[str] = []
        for token in tokens:
            if token.index == token_index:
                rendered_parts.append("ˈ")
            rendered_parts.append(token.text)
        return "".join(rendered_parts)

    if move.action == "insert_copy_before":
        rendered_parts = []
        for token in tokens:
            if token.index == token_index:
                rendered_parts.append(token.text)
            rendered_parts.append(token.text)
        return "".join(rendered_parts)

    raise ValueError(f"Unsupported move action: {move.action}")
